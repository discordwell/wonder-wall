import { describe, it, expect } from 'vitest';
import type { WSContext } from 'hono/ws';
import {
  addController,
  removeController,
  addOutput,
  removeOutput,
  handleControllerMessage,
  getStatus,
} from '../ws.js';

/**
 * ws.ts keeps controllers/outputs in module-level Sets, so tests here
 * measure deltas rather than absolute counts.
 */

interface FakeClient {
  readyState: number;
  sent: string[];
  send: (data: string) => void;
}

function makeClient(opts: { readyState?: number; throwOnSend?: boolean } = {}): FakeClient {
  const sent: string[] = [];
  return {
    readyState: opts.readyState ?? 1,
    sent,
    send(data: string) {
      if (opts.throwOnSend) throw new Error('EPIPE');
      sent.push(data);
    },
  };
}

describe('ws safe send / dead client eviction', () => {
  it('evicts an output client whose send throws during broadcast', () => {
    const ctrl = makeClient();
    const good = makeClient();
    const bad = makeClient({ throwOnSend: true });

    addController(ctrl as unknown as WSContext);
    addOutput(good as unknown as WSContext);
    addOutput(bad as unknown as WSContext);

    const before = getStatus().outputClients;
    handleControllerMessage(
      ctrl as unknown as WSContext,
      JSON.stringify({ type: 'setPattern', id: 'solid', params: { color: '#ff0000' } }),
    );
    const after = getStatus().outputClients;

    expect(after).toBe(before - 1); // bad evicted
    expect(good.sent.some((s) => s.includes('"type":"pattern"'))).toBe(true);

    removeController(ctrl as unknown as WSContext);
    removeOutput(good as unknown as WSContext);
  });

  it('evicts a client whose readyState transitions away from OPEN', () => {
    const ctrl = makeClient();
    const good = makeClient();
    const closing = makeClient();

    addController(ctrl as unknown as WSContext);
    addOutput(good as unknown as WSContext);
    addOutput(closing as unknown as WSContext);

    // Simulate the socket entering CLOSING after the handshake succeeded.
    closing.readyState = 2;

    const before = getStatus().outputClients;
    const sentBefore = closing.sent.length;
    handleControllerMessage(
      ctrl as unknown as WSContext,
      JSON.stringify({ type: 'setPattern', id: 'solid', params: {} }),
    );
    const after = getStatus().outputClients;

    expect(after).toBe(before - 1);
    expect(closing.sent.length).toBe(sentBefore); // no new sends attempted

    removeController(ctrl as unknown as WSContext);
    removeOutput(good as unknown as WSContext);
  });

  it('addOutput rolls back if initial pattern send fails', () => {
    // First set a currentPattern so addOutput tries to send it.
    const ctrl = makeClient();
    addController(ctrl as unknown as WSContext);
    handleControllerMessage(
      ctrl as unknown as WSContext,
      JSON.stringify({ type: 'setPattern', id: 'solid', params: {} }),
    );

    const before = getStatus().outputClients;
    const bad = makeClient({ throwOnSend: true });
    addOutput(bad as unknown as WSContext);
    const after = getStatus().outputClients;

    expect(after).toBe(before); // added then immediately removed, net zero

    removeController(ctrl as unknown as WSContext);
  });
});
