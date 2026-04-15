import {
  isConnected,
  readBrightness,
  readTestMode,
  readDeviceInfo,
  getWallConfig,
  type BrightnessInfo,
  type WallConfig,
} from './novastar.js';

export interface ConfigSnapshot {
  id: string;
  timestamp: string;
  label: string;
  auto: boolean; // true = auto-backup before change, false = manual save
  deviceAddress: string;
  modelId: number | null;
  brightness: BrightnessInfo;
  testMode: number;
  wall: WallConfig | null;
}

// In-memory store (persists across the server session, not across restarts)
// For production, this should be file-backed
const snapshots: ConfigSnapshot[] = [];
const MAX_SNAPSHOTS = 50;

export async function captureSnapshot(
  label: string,
  auto: boolean,
  deviceAddress: string,
): Promise<ConfigSnapshot> {
  const [brightness, testMode, deviceInfo] = await Promise.all([
    readBrightness().catch(() => ({ global: -1, red: -1, green: -1, blue: -1 })),
    readTestMode().catch(() => -1),
    readDeviceInfo().catch(() => ({ modelId: null })),
  ]);

  const snapshot: ConfigSnapshot = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    label,
    auto,
    deviceAddress,
    modelId: deviceInfo.modelId,
    brightness,
    testMode,
    wall: getWallConfig(),
  };

  snapshots.unshift(snapshot);
  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.length = MAX_SNAPSHOTS;
  }

  return snapshot;
}

export function getSnapshots(): ConfigSnapshot[] {
  return snapshots;
}

export function getSnapshot(id: string): ConfigSnapshot | undefined {
  return snapshots.find((s) => s.id === id);
}

export function deleteSnapshot(id: string): boolean {
  const idx = snapshots.findIndex((s) => s.id === id);
  if (idx >= 0) {
    snapshots.splice(idx, 1);
    return true;
  }
  return false;
}
