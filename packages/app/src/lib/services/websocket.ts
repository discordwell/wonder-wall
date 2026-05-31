import {
  parseServerMessage,
  type PatternParams,
  type StatusMessage,
  type NovastarResultMessage,
} from '@wonderwall/patterns';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'unauthorized';

export interface WsCallbacks {
  onStateChange: (state: ConnectionState) => void;
  onPattern: (id: string, params: PatternParams) => void;
  onStatus: (status: StatusMessage) => void;
  onNovastarResult?: (msg: NovastarResultMessage) => void;
}

// WebSocket close code 1008 = policy violation; the server uses it to reject a
// bad/missing PIN. We treat it as terminal (no auto-reconnect).
const CLOSE_POLICY_VIOLATION = 1008;

// Reconnect backoff: 1s, 2s, 4s … capped, so a wrong address or a downed
// server doesn't hammer the network forever at a flat interval.
const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

let ws: WebSocket | null = null;
let callbacks: WsCallbacks | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentUrl: string | null = null;
let intentionalClose = false;
let reconnectAttempts = 0;
let unloadHooked = false;

function clearReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function teardownSocket() {
  if (ws) {
    ws.onopen = ws.onmessage = ws.onerror = null;
    ws.onclose = null; // detach before close so it can't schedule a reconnect
    try {
      ws.close();
    } catch {
      // already closing/closed
    }
    ws = null;
  }
}

function backoffDelay(attempt: number): number {
  return Math.min(MAX_RECONNECT_MS, BASE_RECONNECT_MS * 2 ** attempt);
}

function scheduleReconnect() {
  if (!currentUrl || !callbacks) return;
  const delay = backoffDelay(reconnectAttempts);
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(openSocket, delay);
}

// Close the socket and stop reconnecting when the page goes away, so a
// backgrounded tab doesn't keep retrying.
function hookUnload() {
  if (unloadHooked || typeof window === 'undefined') return;
  unloadHooked = true;
  window.addEventListener('pagehide', () => {
    intentionalClose = true;
    clearReconnect();
    teardownSocket();
  });
}

function openSocket() {
  if (!currentUrl || !callbacks) return;
  const cbs = callbacks;
  teardownSocket();
  clearReconnect();
  cbs.onStateChange('connecting');

  ws = new WebSocket(currentUrl);

  ws.onopen = () => {
    reconnectAttempts = 0;
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

  ws.onclose = (evt) => {
    const code = (evt as CloseEvent | undefined)?.code;
    if (code === CLOSE_POLICY_VIOLATION) {
      // Wrong PIN — surface it and stop, retrying won't help.
      cbs.onStateChange('unauthorized');
      return;
    }
    cbs.onStateChange('disconnected');
    if (!intentionalClose) scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function connect(url: string, cbs: WsCallbacks) {
  callbacks = cbs;
  currentUrl = url;
  intentionalClose = false;
  reconnectAttempts = 0;
  hookUnload();
  openSocket();
}

export function disconnect() {
  intentionalClose = true;
  clearReconnect();
  reconnectAttempts = 0;
  teardownSocket();
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
