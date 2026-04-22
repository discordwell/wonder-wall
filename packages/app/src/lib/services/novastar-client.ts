import type { NovastarResultMessage, WireWallConfig as WallConfig } from '@wonderwall/patterns';
import { sendRaw } from './websocket.ts';

export type { WallConfig };

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
export function handleNovastarResult(msg: NovastarResultMessage, state: NovastarState): NovastarState {
  if (msg.error) {
    return { ...state, error: msg.error };
  }

  switch (msg.action) {
    case 'connect':
      return {
        ...state,
        connected: (msg.connected as boolean | undefined) ?? false,
        modelId: (msg.modelId as number | null | undefined) ?? null,
        wall: (msg.wall as WallConfig | null | undefined) ?? state.wall,
        error: null,
      };

    case 'disconnect':
      return createDefaultNovastarState();

    case 'getBrightness':
    case 'setBrightness':
      return {
        ...state,
        brightness: {
          global: (msg.global as number | undefined) ?? state.brightness.global,
          red: (msg.red as number | undefined) ?? state.brightness.red,
          green: (msg.green as number | undefined) ?? state.brightness.green,
          blue: (msg.blue as number | undefined) ?? state.brightness.blue,
        },
        error: null,
      };

    case 'getWallConfig':
      return {
        ...state,
        wall: msg.columns ? {
          totalWidth: msg.totalWidth as number,
          totalHeight: msg.totalHeight as number,
          columns: msg.columns as number,
          rows: msg.rows as number,
          cabinetWidth: msg.cabinetWidth as number,
          cabinetHeight: msg.cabinetHeight as number,
        } : state.wall,
        error: null,
      };

    case 'getConfigSnapshots':
      return {
        ...state,
        snapshots: ((msg.snapshots as ConfigSnapshot[] | undefined) ?? []).map((s) => ({
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
      sendNovastarCommand('getConfigSnapshots', {});
      return { ...state, error: null };

    case 'restoreConfig':
      sendNovastarCommand('getBrightness', {});
      sendNovastarCommand('getConfigSnapshots', {});
      return { ...state, error: null };

    default:
      return { ...state, error: null };
  }
}
