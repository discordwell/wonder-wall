import { connect as tcpConnect, type Socket } from 'node:net';
import { Connection, Session } from '@novastar/codec';

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

const NOVASTAR_PORT = 5200;
const CONNECT_TIMEOUT = 5000;

export interface NovastarDeviceInfo {
  address: string;
  modelId: number | null;
  connected: boolean;
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

export async function connectToDevice(host: string): Promise<NovastarDeviceInfo> {
  // Disconnect any existing connection
  disconnectDevice();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket?.destroy();
      reject(new Error(`Connection timeout to ${host}:${NOVASTAR_PORT}`));
    }, CONNECT_TIMEOUT);

    socket = tcpConnect(NOVASTAR_PORT, host, () => {
      clearTimeout(timer);

      try {
        connection = new Connection(socket!);
        session = new Session(connection) as any;
        deviceAddress = host;

        resolve({
          address: host,
          modelId: null,
          connected: true,
        });
      } catch (err) {
        clearTimeout(timer);
        socket?.destroy();
        reject(err);
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to connect to ${host}: ${err.message}`));
    });

    socket.on('close', () => {
      session = null;
      connection = null;
      socket = null;
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
 * Scan for Novastar devices on the local network.
 * Tries common addresses by attempting TCP connections on port 5200.
 */
export async function discoverDevices(subnet?: string): Promise<string[]> {
  const base = subnet ?? '192.168.1';
  const found: string[] = [];
  const promises: Promise<void>[] = [];

  // Scan common addresses (1-254) with short timeout
  for (let i = 1; i <= 254; i++) {
    const host = `${base}.${i}`;
    promises.push(
      new Promise<void>((resolve) => {
        const sock = tcpConnect({ host, port: NOVASTAR_PORT, timeout: 1000 }, () => {
          found.push(host);
          sock.destroy();
          resolve();
        });
        sock.on('error', () => { sock.destroy(); resolve(); });
        sock.on('timeout', () => { sock.destroy(); resolve(); });
      }),
    );
  }

  // Run in batches of 50 to avoid overwhelming the network
  for (let i = 0; i < promises.length; i += 50) {
    await Promise.all(promises.slice(i, i + 50));
  }

  return found;
}
