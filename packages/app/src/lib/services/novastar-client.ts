import { sendRaw } from './websocket.ts';

export interface WallConfig {
  totalWidth: number;
  totalHeight: number;
  columns: number;
  rows: number;
  cabinetWidth: number;
  cabinetHeight: number;
}

export interface ConfigSnapshot {
  id: string;
  timestamp: string;
  label: string;
  auto: boolean;
  brightness: { global: number; red: number; green: number; blue: number };
  testMode: number;
}

export interface NovastarState {
  connected: boolean;
  modelId: number | null;
  brightness: {
    global: number;
    red: number;
    green: number;
    blue: number;
  };
  wall: WallConfig | null;
  snapshots: ConfigSnapshot[];
  error: string | null;
}

export function createDefaultNovastarState(): NovastarState {
  return {
    connected: false,
    modelId: null,
    brightness: { global: 255, red: 255, green: 255, blue: 255 },
    wall: null,
    snapshots: [],
    error: null,
  };
}

export function sendNovastarCommand(action: string, params: Record<string, unknown>) {
  sendRaw(JSON.stringify({ type: 'novastar', action, ...params }));
}

/** Handle a novastarResult message from the server and update state */
export function handleNovastarResult(msg: any, state: NovastarState): NovastarState {
  if (msg.error) {
    return { ...state, error: msg.error };
  }

  switch (msg.action) {
    case 'connect':
      return {
        ...state,
        connected: msg.connected ?? false,
        modelId: msg.modelId ?? null,
        wall: msg.wall ?? state.wall,
        error: null,
      };

    case 'disconnect':
      return createDefaultNovastarState();

    case 'getBrightness':
    case 'setBrightness':
      return {
        ...state,
        brightness: {
          global: msg.global ?? state.brightness.global,
          red: msg.red ?? state.brightness.red,
          green: msg.green ?? state.brightness.green,
          blue: msg.blue ?? state.brightness.blue,
        },
        error: null,
      };

    case 'getWallConfig':
      return {
        ...state,
        wall: msg.columns ? {
          totalWidth: msg.totalWidth,
          totalHeight: msg.totalHeight,
          columns: msg.columns,
          rows: msg.rows,
          cabinetWidth: msg.cabinetWidth,
          cabinetHeight: msg.cabinetHeight,
        } : state.wall,
        error: null,
      };

    case 'getConfigSnapshots':
      return {
        ...state,
        snapshots: (msg.snapshots ?? []).map((s: any) => ({
          id: s.id,
          timestamp: s.timestamp,
          label: s.label,
          auto: s.auto,
          brightness: s.brightness,
          testMode: s.testMode,
        })),
        error: null,
      };

    case 'saveConfig':
      // Refresh the list after saving
      sendNovastarCommand('getConfigSnapshots', {});
      return { ...state, error: null };

    case 'restoreConfig':
      // Refresh brightness after restore
      sendNovastarCommand('getBrightness', {});
      sendNovastarCommand('getConfigSnapshots', {});
      return { ...state, error: null };

    default:
      return { ...state, error: null };
  }
}
