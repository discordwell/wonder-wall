import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Mock WebSocket implementation we install globally. Each instance stores
 * sent frames and exposes helpers to simulate server events.
 */
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = 0; // CONNECTING
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onclose: ((evt?: { code?: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) throw new Error('not open');
    this.sent.push(data);
  }

  close(code?: number) {
    if (this.readyState === MockWebSocket.CLOSED) return;
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code });
  }

  // Test helpers
  simulateOpen() { this.readyState = MockWebSocket.OPEN; this.onopen?.(); }
  simulateMessage(data: string) { this.onmessage?.({ data }); }
  simulateServerClose(code?: number) { this.readyState = MockWebSocket.CLOSED; this.onclose?.({ code }); }
}

describe('websocket service', () => {
  let originalWS: typeof WebSocket;

  beforeEach(() => {
    originalWS = globalThis.WebSocket;
    MockWebSocket.instances = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = MockWebSocket;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.WebSocket = originalWS;
    vi.resetModules();
  });

  async function freshService() {
    vi.resetModules();
    return import('../lib/services/websocket.ts');
  }

  function makeCallbacks() {
    return {
      onStateChange: vi.fn(),
      onPattern: vi.fn(),
      onStatus: vi.fn(),
      onNovastarResult: vi.fn(),
    };
  }

  it('transitions connecting → connected on open', async () => {
    const ws = await freshService();
    const cbs = makeCallbacks();
    ws.connect('ws://localhost:3333', cbs);
    expect(cbs.onStateChange).toHaveBeenCalledWith('connecting');
    MockWebSocket.instances[0].simulateOpen();
    expect(cbs.onStateChange).toHaveBeenCalledWith('connected');
  });

  it('routes server pattern messages to onPattern', async () => {
    const ws = await freshService();
    const cbs = makeCallbacks();
    ws.connect('ws://localhost:3333', cbs);
    MockWebSocket.instances[0].simulateOpen();
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: 'pattern', id: 'solid', params: { color: '#ff0000' } }),
    );
    expect(cbs.onPattern).toHaveBeenCalledWith('solid', { color: '#ff0000' });
  });

  it('ignores malformed server messages silently', async () => {
    const ws = await freshService();
    const cbs = makeCallbacks();
    ws.connect('ws://localhost:3333', cbs);
    MockWebSocket.instances[0].simulateOpen();
    MockWebSocket.instances[0].simulateMessage('{not json');
    MockWebSocket.instances[0].simulateMessage(JSON.stringify({ type: 'unknown' }));
    expect(cbs.onPattern).not.toHaveBeenCalled();
    expect(cbs.onStatus).not.toHaveBeenCalled();
    expect(cbs.onNovastarResult).not.toHaveBeenCalled();
  });

  it('reconnects after a server-initiated close (first attempt at 1s)', async () => {
    const ws = await freshService();
    ws.connect('ws://localhost:3333', makeCallbacks());
    MockWebSocket.instances[0].simulateServerClose();
    expect(MockWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(999);
    expect(MockWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1].url).toBe('ws://localhost:3333');
  });

  it('uses exponential backoff across repeated failures', async () => {
    const ws = await freshService();
    ws.connect('ws://localhost:3333', makeCallbacks());

    // 1st retry after 1s
    MockWebSocket.instances[0].simulateServerClose();
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(2);

    // 2nd retry after 2s
    MockWebSocket.instances[1].simulateServerClose();
    vi.advanceTimersByTime(1999);
    expect(MockWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(3);

    // 3rd retry after 4s
    MockWebSocket.instances[2].simulateServerClose();
    vi.advanceTimersByTime(3999);
    expect(MockWebSocket.instances).toHaveLength(3);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(4);
  });

  it('resets backoff after a successful open', async () => {
    const ws = await freshService();
    ws.connect('ws://localhost:3333', makeCallbacks());

    MockWebSocket.instances[0].simulateServerClose();
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(2);

    // Successful open resets the backoff counter…
    MockWebSocket.instances[1].simulateOpen();
    MockWebSocket.instances[1].simulateServerClose();
    // …so the next retry is back to 1s, not 2s.
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('does not reconnect after an auth rejection (close 1008)', async () => {
    const ws = await freshService();
    const cbs = makeCallbacks();
    ws.connect('ws://localhost:3333/ws/control?pin=000000', cbs);
    MockWebSocket.instances[0].simulateServerClose(1008);
    expect(cbs.onStateChange).toHaveBeenCalledWith('unauthorized');
    vi.advanceTimersByTime(60000);
    expect(MockWebSocket.instances).toHaveLength(1); // no reconnect
  });

  it('disconnect() cancels a pending reconnect timer', async () => {
    const ws = await freshService();
    ws.connect('ws://localhost:3333', makeCallbacks());
    MockWebSocket.instances[0].simulateServerClose();
    ws.disconnect();
    vi.advanceTimersByTime(60000);
    expect(MockWebSocket.instances).toHaveLength(1); // no reconnect happened
  });

  it('sendPattern is a no-op when the socket is not OPEN', async () => {
    const ws = await freshService();
    ws.connect('ws://localhost:3333', makeCallbacks());
    // still CONNECTING
    ws.sendPattern('solid', {});
    expect(MockWebSocket.instances[0].sent).toHaveLength(0);
    // after open
    MockWebSocket.instances[0].simulateOpen();
    ws.sendPattern('solid', { color: '#ff0000' });
    expect(MockWebSocket.instances[0].sent).toHaveLength(1);
    const parsed = JSON.parse(MockWebSocket.instances[0].sent[0]);
    expect(parsed).toMatchObject({ type: 'setPattern', id: 'solid', params: { color: '#ff0000' } });
  });

  it('isConnected reflects readyState', async () => {
    const ws = await freshService();
    expect(ws.isConnected()).toBe(false);
    ws.connect('ws://localhost:3333', makeCallbacks());
    expect(ws.isConnected()).toBe(false); // connecting
    MockWebSocket.instances[0].simulateOpen();
    expect(ws.isConnected()).toBe(true);
    MockWebSocket.instances[0].simulateServerClose();
    expect(ws.isConnected()).toBe(false);
  });
});
