import type { WSContext } from 'hono/ws';
import {
  isConnected as novastarConnected,
  readBrightness,
  setBrightness,
  setTestMode,
  connectToDevice,
  disconnectDevice,
  readDeviceInfo,
  readWallLayout,
  getWallConfig,
  type BrightnessInfo,
  type WallConfig,
  TestMode,
} from './services/novastar.js';
import { captureSnapshot, getSnapshots, getSnapshot } from './services/config-backup.js';

export interface PatternCommand {
  type: 'setPattern';
  id: string;
  params: Record<string, unknown>;
}

export interface StatusMessage {
  type: 'status';
  outputClients: number;
  currentPattern: string | null;
  novastar: { connected: boolean; wall: WallConfig | null };
}

type Client = WSContext;

const controllers: Set<Client> = new Set();
const outputs: Set<Client> = new Set();

let currentPattern: { id: string; params: Record<string, unknown> } | null = null;

export function addController(ws: Client) {
  controllers.add(ws);
  // Send current state
  if (currentPattern) {
    ws.send(JSON.stringify({ type: 'pattern', ...currentPattern }));
  }
  broadcastStatus();
}

export function removeController(ws: Client) {
  controllers.delete(ws);
}

export function addOutput(ws: Client) {
  outputs.add(ws);
  // Send current pattern immediately
  if (currentPattern) {
    ws.send(JSON.stringify({ type: 'pattern', ...currentPattern }));
  }
  broadcastStatus();
}

export function removeOutput(ws: Client) {
  outputs.delete(ws);
  broadcastStatus();
}

export function handleControllerMessage(ws: Client, data: string) {
  try {
    const msg = JSON.parse(data);
    if (msg.type === 'setPattern') {
      currentPattern = { id: msg.id, params: msg.params ?? {} };
      const outMsg = JSON.stringify({ type: 'pattern', id: msg.id, params: msg.params ?? {} });
      for (const output of outputs) output.send(outMsg);
      for (const ctrl of controllers) ctrl.send(outMsg);
    } else if (msg.type === 'novastar') {
      handleNovastarCommand(ws, msg);
    }
  } catch {
    // Ignore malformed messages
  }
}

async function handleNovastarCommand(ws: Client, msg: any) {
  try {
    let result: any;

    switch (msg.action) {
      case 'connect':
        await connectToDevice(msg.host);
        const info = await readDeviceInfo();
        const wall = await readWallLayout();
        result = { connected: true, ...info, wall };
        broadcastStatus();
        break;

      case 'getWallConfig':
        result = getWallConfig() ?? await readWallLayout() ?? { error: 'Could not detect wall layout' };
        break;

      case 'disconnect':
        disconnectDevice();
        result = { connected: false };
        broadcastStatus();
        break;

      case 'getBrightness':
        result = await readBrightness();
        break;

      case 'setBrightness':
        // Auto-backup before change
        await captureSnapshot(`Before brightness ${msg.channel ?? 'global'} → ${msg.value}`, true, msg.host ?? '').catch(() => {});
        await setBrightness(msg.value, msg.channel ?? 'global');
        result = await readBrightness();
        break;

      case 'setTestMode':
        await captureSnapshot(`Before test mode → ${msg.mode}`, true, msg.host ?? '').catch(() => {});
        await setTestMode(msg.mode as TestMode);
        result = { mode: msg.mode };
        break;

      case 'saveConfig':
        result = await captureSnapshot(msg.label ?? 'Manual save', false, msg.host ?? '');
        break;

      case 'getConfigSnapshots':
        result = { snapshots: getSnapshots() };
        break;

      case 'restoreConfig': {
        const snap = getSnapshot(msg.id);
        if (!snap) { result = { error: 'Snapshot not found' }; break; }
        // Auto-backup current state before restoring
        await captureSnapshot(`Before restore → ${snap.label}`, true, snap.deviceAddress).catch(() => {});
        if (snap.brightness.global >= 0) await setBrightness(snap.brightness.global, 'global').catch(() => {});
        if (snap.brightness.red >= 0) await setBrightness(snap.brightness.red, 'red').catch(() => {});
        if (snap.brightness.green >= 0) await setBrightness(snap.brightness.green, 'green').catch(() => {});
        if (snap.brightness.blue >= 0) await setBrightness(snap.brightness.blue, 'blue').catch(() => {});
        if (snap.testMode >= 0) await setTestMode(snap.testMode as TestMode).catch(() => {});
        result = { restored: snap.id, label: snap.label };
        break;
      }

      default:
        result = { error: `Unknown action: ${msg.action}` };
    }

    ws.send(JSON.stringify({ type: 'novastarResult', action: msg.action, ...result }));
  } catch (err) {
    ws.send(JSON.stringify({
      type: 'novastarResult',
      action: msg.action,
      error: (err as Error).message,
    }));
  }
}

function broadcastStatus() {
  const msg: StatusMessage = {
    type: 'status',
    outputClients: outputs.size,
    currentPattern: currentPattern?.id ?? null,
    novastar: { connected: novastarConnected(), wall: getWallConfig() },
  };
  const data = JSON.stringify(msg);
  for (const ctrl of controllers) {
    ctrl.send(data);
  }
}

export function getStatus() {
  return {
    outputClients: outputs.size,
    controllerClients: controllers.size,
    currentPattern: currentPattern?.id ?? null,
    novastar: { connected: novastarConnected(), wall: getWallConfig() },
  };
}
