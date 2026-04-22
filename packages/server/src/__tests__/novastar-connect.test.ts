import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type Server, type Socket } from 'node:net';
import { connectToDevice, disconnectDevice } from '../services/novastar.js';

/**
 * These tests exercise the connectToDevice promise contract:
 * it must settle exactly once regardless of which of (timeout / connect-callback /
 * socket-error) fires first. Previously a timeout-then-error race could cause
 * reject() to fire twice — harmless on a Promise, but a signal that the
 * lifecycle logic wasn't guarded.
 *
 * We observe settlement via process 'unhandledRejection' and via counting
 * how many times the returned promise settles.
 */

function pickPort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => resolve(port));
    });
  });
}

describe('connectToDevice settlement', () => {
  let unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  beforeEach(() => {
    unhandled = [];
    process.on('unhandledRejection', onUnhandled);
  });

  afterEach(async () => {
    process.off('unhandledRejection', onUnhandled);
    disconnectDevice();
    // Give any queued microtasks a chance to surface unhandled rejections
    await new Promise((r) => setTimeout(r, 50));
    expect(unhandled, 'connectToDevice produced an unhandled rejection').toEqual([]);
  });

  it('rejects once on connection refused', async () => {
    const port = await pickPort(); // now closed -> ECONNREFUSED
    await expect(connectToDevice('127.0.0.1', port)).rejects.toThrow(/Failed to connect|ECONNREFUSED/);
  });

  it('rejects once when the server accepts then immediately destroys', async () => {
    const server: Server = createServer((socket: Socket) => {
      socket.destroy(new Error('bye'));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    try {
      // Either resolves (we got the connect callback first) or rejects
      // (error beat the callback). Either way, exactly one settlement.
      let settlements = 0;
      const p = connectToDevice('127.0.0.1', port)
        .then(() => { settlements++; })
        .catch(() => { settlements++; });
      await p;
      expect(settlements).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('resolves once against a passive accepting server', async () => {
    const server: Server = createServer(() => {
      // Hold the connection open, do nothing
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    try {
      const info = await connectToDevice('127.0.0.1', port);
      expect(info.connected).toBe(true);
      expect(info.address).toBe('127.0.0.1');
    } finally {
      disconnectDevice();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
