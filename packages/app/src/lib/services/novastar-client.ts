import { sendRaw } from './websocket.ts';

export interface NovastarState {
  connected: boolean;
  modelId: number | null;
  brightness: {
    global: number;
    red: number;
    green: number;
    blue: number;
  };
  error: string | null;
}

export function createDefaultNovastarState(): NovastarState {
  return {
    connected: false,
    modelId: null,
    brightness: { global: 255, red: 255, green: 255, blue: 255 },
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

    default:
      return { ...state, error: null };
  }
}
