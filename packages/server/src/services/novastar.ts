import { connect as tcpConnect, type Socket } from 'node:net';
import { Connection, Session } from '@novastar/codec';
import { mapWithConcurrency } from './concurrency.js';

// Import the specific native API methods we need
import '@novastar/native/api/ReadControllerModelId';
import '@novastar/native/api/ReadGlobalBrightness';
import '@novastar/native/api/SetGlobalBrightness';
import '@novastar/native/api/ReadRedBrightness';
import '@novastar/native/api/SetRedBrightness';
import '@novastar/native/api/ReadGreenBrightness';
import '@novastar/native/api/SetGreenBrightness';
import '@novastar/native/api/ReadBlueBrightness';
import '@novastar/native/api/SetBlueBrightness';
import '@novastar/native/api/ReadSelfTestMode';
import '@novastar/native/api/SetSelfTestMode';
import '@novastar/native/api/ReadDisplayMode';
// Wall layout detection
import '@novastar/native/api/ReadSender_DVIResolutionWidth';
import '@novastar/native/api/ReadSender_DVIResolutionHeight';
import '@novastar/native/api/ReadNumberOfCardOrScanBoardInPort';
import '@novastar/native/api/ReadModuleWidth';
import '@novastar/native/api/ReadModuleHeight';
import '@novastar/native/api/ReadPortWidth';
import '@novastar/native/api/ReadPortHeight';
import '@novastar/native/api/ReadEthernetPortScannerX';
import '@novastar/native/api/ReadEthernetPortScannerY';

const NOVASTAR_PORT = 5200;
const CONNECT_TIMEOUT = 5000;

export interface NovastarDeviceInfo {
  address: string;
  modelId: number | null;
  connected: boolean;
}

export interface CabinetInfo {
  port: number;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WallConfig {
  totalWidth: number;
  totalHeight: number;
  columns: number;
  rows: number;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinets: CabinetInfo[];
  detectedAt: string;
}

export interface BrightnessInfo {
  global: number;
  red: number;
  green: number;
  blue: number;
}

export enum TestMode {
  Normal = 0,
  Red = 2,
  Green = 3,
  Blue = 4,
  White = 5,
  HorizontalLines = 6,
  VerticalLines = 7,
  DiagonalLines = 8,
  GrayGradient = 9,
}

let socket: Socket | null = null;
let connection: Connection<Socket> | null = null;
let session: (Session<Socket> & Record<string, any>) | null = null;
let deviceAddress: string | null = null;
let wallConfig: WallConfig | null = null;

export function isConnected(): boolean {
  return session !== null && socket !== null && !socket.destroyed;
}

export function getStatus(): NovastarDeviceInfo | null {
  if (!isConnected() || !deviceAddress) return null;
  return {
    address: deviceAddress,
    modelId: null,
    connected: true,
  };
}

export async function connectToDevice(
  host: string,
  port: number = NOVASTAR_PORT,
): Promise<NovastarDeviceInfo> {
  // Disconnect any existing connection
  disconnectDevice();

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      settle(() => {
        sock.destroy();
        reject(new Error(`Connection timeout to ${host}:${port}`));
      });
    }, CONNECT_TIMEOUT);

    // Bind everything to THIS socket via a local, not the module-level `socket`.
    // A reconnect destroys the previous socket, whose 'close' fires on a later
    // tick; if its handler read/wrote the shared module state it would null out
    // the freshly-established connection. Capturing `sock` keeps each socket's
    // lifecycle callbacks scoped to itself.
    const sock = tcpConnect(port, host, () => {
      settle(() => {
        try {
          connection = new Connection(sock);
          session = new Session(connection) as any;
          deviceAddress = host;
          resolve({ address: host, modelId: null, connected: true });
        } catch (err) {
          sock.destroy();
          reject(err as Error);
        }
      });
    });
    socket = sock;

    sock.on('error', (err) => {
      settle(() => reject(new Error(`Failed to connect to ${host}: ${err.message}`)));
    });

    sock.on('close', () => {
      // Only reset shared state if this socket is still the active one. An old
      // socket closing after a reconnect must not disturb the new connection.
      if (socket === sock) {
        session = null;
        connection = null;
        socket = null;
      }
    });
  });
}

export function disconnectDevice(): void {
  try {
    session?.close();
  } catch {
    // Ignore close errors
  }
  try {
    socket?.destroy();
  } catch {
    // Ignore
  }
  session = null;
  connection = null;
  socket = null;
  deviceAddress = null;
  wallConfig = null;
}

export function getWallConfig(): WallConfig | null {
  return wallConfig;
}

/**
 * Auto-detect the video wall layout by querying the Novastar controller.
 * Reads total resolution, cabinet dimensions, and scanner positions
 * to calculate the grid layout.
 */
export async function readWallLayout(): Promise<WallConfig | null> {
  if (!session) throw new Error('Not connected');

  try {
    // Read total wall resolution
    const totalWidth = await session.ReadSender_DVIResolutionWidth(0).catch(() => 0);
    const totalHeight = await session.ReadSender_DVIResolutionHeight(0).catch(() => 0);

    if (totalWidth === 0 || totalHeight === 0) {
      return null;
    }

    // Try to read cabinet dimensions from the first receiving card on port 0
    const cabinetWidth = await session.ReadModuleWidth(0, 0, 0).catch(() => 0);
    const cabinetHeight = await session.ReadModuleHeight(0, 0, 0).catch(() => 0);

    // Calculate grid from total / cabinet dimensions
    let columns = 1;
    let rows = 1;
    if (cabinetWidth > 0 && cabinetHeight > 0) {
      columns = Math.round(totalWidth / cabinetWidth);
      rows = Math.round(totalHeight / cabinetHeight);
    }

    // Try to read individual cabinet positions
    const cabinets: CabinetInfo[] = [];

    // Scan ports (typically 1-4 Ethernet ports on a sending card)
    for (let port = 0; port < 4; port++) {
      const cardCount = await session.ReadNumberOfCardOrScanBoardInPort(0, port, 0).catch(() => 0);
      if (cardCount === 0) continue;

      for (let card = 0; card < cardCount; card++) {
        const x = await session.ReadEthernetPortScannerX(0, port, card).catch(() => -1);
        const y = await session.ReadEthernetPortScannerY(0, port, card).catch(() => -1);
        const w = await session.ReadModuleWidth(0, port, card).catch(() => cabinetWidth);
        const h = await session.ReadModuleHeight(0, port, card).catch(() => cabinetHeight);

        if (x >= 0 && y >= 0) {
          cabinets.push({ port, index: card, x, y, width: w, height: h });
        }
      }
    }

    // If we got cabinet positions, recalculate grid more accurately
    if (cabinets.length > 0 && cabinetWidth > 0 && cabinetHeight > 0) {
      const maxCol = Math.max(...cabinets.map((c) => Math.round(c.x / cabinetWidth)));
      const maxRow = Math.max(...cabinets.map((c) => Math.round(c.y / cabinetHeight)));
      columns = maxCol + 1;
      rows = maxRow + 1;
    }

    wallConfig = {
      totalWidth,
      totalHeight,
      columns: Math.max(1, columns),
      rows: Math.max(1, rows),
      cabinetWidth: cabinetWidth || totalWidth,
      cabinetHeight: cabinetHeight || totalHeight,
      cabinets,
      detectedAt: new Date().toISOString(),
    };

    return wallConfig;
  } catch {
    return null;
  }
}

export async function readDeviceInfo(): Promise<{ modelId: number | null }> {
  if (!session) throw new Error('Not connected');
  try {
    const modelId = await session.ReadControllerModelId(0);
    return { modelId };
  } catch {
    return { modelId: null };
  }
}

export async function readBrightness(
  portAddr = 0,
  scanBoardAddr = 0,
): Promise<BrightnessInfo> {
  if (!session) throw new Error('Not connected');
  const [global, red, green, blue] = await Promise.all([
    session.ReadGlobalBrightness(0, portAddr, scanBoardAddr).catch(() => -1),
    session.ReadRedBrightness(0, portAddr, scanBoardAddr).catch(() => -1),
    session.ReadGreenBrightness(0, portAddr, scanBoardAddr).catch(() => -1),
    session.ReadBlueBrightness(0, portAddr, scanBoardAddr).catch(() => -1),
  ]);
  return { global, red, green, blue };
}

export async function setBrightness(
  value: number,
  channel: 'global' | 'red' | 'green' | 'blue' = 'global',
  portAddr = 0,
  scanBoardAddr = 0,
): Promise<void> {
  if (!session) throw new Error('Not connected');
  const v = Math.max(0, Math.min(255, Math.round(value)));

  switch (channel) {
    case 'red':
      await session.SetRedBrightness(0, portAddr, scanBoardAddr, false, v);
      break;
    case 'green':
      await session.SetGreenBrightness(0, portAddr, scanBoardAddr, false, v);
      break;
    case 'blue':
      await session.SetBlueBrightness(0, portAddr, scanBoardAddr, false, v);
      break;
    default:
      await session.SetGlobalBrightness(0, portAddr, scanBoardAddr, false, v);
      break;
  }
}

export async function readTestMode(portAddr = 0, scanBoardAddr = 0): Promise<number> {
  if (!session) throw new Error('Not connected');
  return session.ReadSelfTestMode(0, portAddr, scanBoardAddr);
}

export async function setTestMode(
  mode: TestMode,
  portAddr = 0,
  scanBoardAddr = 0,
): Promise<void> {
  if (!session) throw new Error('Not connected');
  await session.SetSelfTestMode(0, portAddr, scanBoardAddr, false, mode);
}

/**
 * Scan for Novastar devices on the local network by attempting TCP connections
 * on port 5200. Probes run through a bounded worker pool so at most
 * SCAN_CONCURRENCY sockets are open at once — a full 254-host SYN burst can
 * trip intrusion detection on a production AV network.
 */
const SCAN_CONCURRENCY = 32;

function probeHost(host: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const sock = tcpConnect({ host, port: NOVASTAR_PORT, timeout: 1000 }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => { sock.destroy(); resolve(false); });
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
  });
}

export async function discoverDevices(subnet?: string): Promise<string[]> {
  const base = subnet ?? '192.168.1';
  const hosts = Array.from({ length: 254 }, (_, i) => `${base}.${i + 1}`);
  const reachable = await mapWithConcurrency(hosts, SCAN_CONCURRENCY, probeHost);
  return hosts.filter((_, i) => reachable[i]);
}
