import type { WSContext } from 'hono/ws';
import {
  type NovastarCommand,
  type StatusMessage,
  parseClientMessage,
} from '@wonderwall/patterns';
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
  TestMode,
} from './services/novastar.js';
import { captureSnapshot, getSnapshots, getSnapshot } from './services/config-backup.js';

type Client = WSContext;

const controllers: Set<Client> = new Set();
const outputs: Set<Client> = new Set();

let currentPattern: { id: string; params: Record<string, unknown> } | null = null;

/**
 * Send to a single client. Returns false if the client was closed or send
 * threw (e.g. underlying socket gone). Never throws — callers decide whether
 * to evict the dead client from their set.
 */
function safeSend(ws: Client, data: string): boolean {
  try {
    if (ws.readyState !== 1) return false;
    ws.send(data);
    return true;
  } catch {
    return false;
  }
}

function broadcast(set: Set<Client>, data: string) {
  const dead: Client[] = [];
  for (const ws of set) {
    if (!safeSend(ws, data)) dead.push(ws);
  }
  for (const ws of dead) set.delete(ws);
}

export function addController(ws: Client) {
  controllers.add(ws);
  if (currentPattern) {
    if (!safeSend(ws, JSON.stringify({ type: 'pattern', ...currentPattern }))) {
      controllers.delete(ws);
      return;
    }
  }
  broadcastStatus();
}

export function removeController(ws: Client) {
  controllers.delete(ws);
}

export function addOutput(ws: Client) {
  outputs.add(ws);
  if (currentPattern) {
    if (!safeSend(ws, JSON.stringify({ type: 'pattern', ...currentPattern }))) {
      outputs.delete(ws);
      return;
    }
  }
  broadcastStatus();
}

export function removeOutput(ws: Client) {
  outputs.delete(ws);
  broadcastStatus();
}

export function handleControllerMessage(ws: Client, data: string) {
  const msg = parseClientMessage(data);
  if (!msg) return;
  if (msg.type === 'setPattern') {
    currentPattern = { id: msg.id, params: msg.params ?? {} };
    const outMsg = JSON.stringify({ type: 'pattern', id: msg.id, params: msg.params ?? {} });
    broadcast(outputs, outMsg);
    broadcast(controllers, outMsg);
  } else if (msg.type === 'novastar') {
    handleNovastarCommand(ws, msg);
  }
}

async function handleNovastarCommand(ws: Client, msg: NovastarCommand) {
  try {
    // result shape is action-specific (BrightnessInfo, WallConfig, snapshot,
    // plain {error} etc.) — a single tight type is more ceremony than signal.
    let result: any;

    const host = (msg.host as string | undefined) ?? '';

    switch (msg.action) {
      case 'connect':
        await connectToDevice(msg.host as string);
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

      case 'setBrightness': {
        const channel = (msg.channel as 'global' | 'red' | 'green' | 'blue' | undefined) ?? 'global';
        const value = msg.value as number;
        await captureSnapshot(`Before brightness ${channel} → ${value}`, true, host).catch(() => {});
        await setBrightness(value, channel);
        result = await readBrightness();
        break;
      }

      case 'setTestMode': {
        const mode = msg.mode as number;
        await captureSnapshot(`Before test mode → ${mode}`, true, host).catch(() => {});
        await setTestMode(mode as TestMode);
        result = { mode };
        break;
      }

      case 'saveConfig':
        result = await captureSnapshot((msg.label as string | undefined) ?? 'Manual save', false, host);
        break;

      case 'getConfigSnapshots':
        result = { snapshots: getSnapshots() };
        break;

      case 'restoreConfig': {
        const snap = getSnapshot(msg.id as string);
        if (!snap) { result = { error: 'Snapshot not found' }; break; }
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

    safeSend(ws, JSON.stringify({ type: 'novastarResult', action: msg.action, ...result }));
  } catch (err) {
    safeSend(ws, JSON.stringify({
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
  broadcast(controllers, JSON.stringify(msg));
}

export function getStatus() {
  return {
    outputClients: outputs.size,
    controllerClients: controllers.size,
    currentPattern: currentPattern?.id ?? null,
    novastar: { connected: novastarConnected(), wall: getWallConfig() },
  };
}
