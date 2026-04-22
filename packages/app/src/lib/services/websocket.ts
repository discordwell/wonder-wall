import {
  parseServerMessage,
  type PatternParams,
  type StatusMessage,
  type NovastarResultMessage,
} from '@wonderwall/patterns';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface WsCallbacks {
  onStateChange: (state: ConnectionState) => void;
  onPattern: (id: string, params: PatternParams) => void;
  onStatus: (status: StatusMessage) => void;
  onNovastarResult?: (msg: NovastarResultMessage) => void;
}

let ws: WebSocket | null = null;
let callbacks: WsCallbacks | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connect(url: string, cbs: WsCallbacks) {
  callbacks = cbs;
  disconnect();
  cbs.onStateChange('connecting');

  ws = new WebSocket(url);

  ws.onopen = () => {
    cbs.onStateChange('connected');
  };

  ws.onmessage = (evt) => {
    const msg = parseServerMessage(evt.data);
    if (!msg) return;
    if (msg.type === 'pattern') {
      cbs.onPattern(msg.id, msg.params ?? {});
    } else if (msg.type === 'status') {
      cbs.onStatus(msg);
    } else if (msg.type === 'novastarResult') {
      cbs.onNovastarResult?.(msg);
    }
  };

  ws.onclose = () => {
    cbs.onStateChange('disconnected');
    // Auto-reconnect after 3 seconds
    reconnectTimer = setTimeout(() => connect(url, cbs), 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null; // Prevent auto-reconnect
    ws.close();
    ws = null;
  }
  callbacks?.onStateChange('disconnected');
}

export function sendPattern(id: string, params: Record<string, unknown>) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'setPattern', id, params }));
  }
}

export function sendRaw(data: string) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(data);
  }
}

export function isConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}
