import { describe, it, expect } from 'vitest';
import type { WSContext } from 'hono/ws';
import {
  addController,
  removeController,
  addOutput,
  removeOutput,
  handleControllerMessage,
} from '../ws.js';

/**
 * The control WS relays setPattern to the HDMI output box, whose inline
 * renderers can be driven into an infinite loop by out-of-range params (e.g.
 * crosshatch spacing <= 0). handleControllerMessage must clamp params to the
 * pattern's declared contract and drop unknown pattern ids before relaying.
 */

interface FakeClient {
  readyState: number;
  sent: string[];
  send: (data: string) => void;
}

function makeClient(): FakeClient {
  const sent: string[] = [];
  return { readyState: 1, sent, send: (d) => sent.push(d) };
}

function patternMessages(c: FakeClient): Array<{ id: string; params: Record<string, unknown> }> {
  return c.sent
    .map((s) => JSON.parse(s))
    .filter((m) => m.type === 'pattern');
}

describe('control relay sanitizes pattern params', () => {
  it('clamps an out-of-range param before broadcasting to the output', () => {
    const ctrl = makeClient();
    const out = makeClient();
    addController(ctrl as unknown as WSContext);
    addOutput(out as unknown as WSContext);

    const baseline = out.sent.length;
    handleControllerMessage(
      ctrl as unknown as WSContext,
      JSON.stringify({ type: 'setPattern', id: 'crosshatch', params: { spacing: -5 } }),
    );

    const relayed = out.sent.slice(baseline).map((s) => JSON.parse(s)).filter((m) => m.type === 'pattern');
    expect(relayed.length).toBe(1);
    expect(relayed[0].id).toBe('crosshatch');
    // -5 clamped up to the declared min (8); missing keys filled with defaults.
    expect(relayed[0].params.spacing).toBe(8);
    expect(relayed[0].params.lineColor).toBe('#ffffff');

    removeController(ctrl as unknown as WSContext);
    removeOutput(out as unknown as WSContext);
  });

  it('drops an unknown pattern id instead of relaying it', () => {
    const ctrl = makeClient();
    const out = makeClient();
    addController(ctrl as unknown as WSContext);
    addOutput(out as unknown as WSContext);

    const before = patternMessages(out).length;
    handleControllerMessage(
      ctrl as unknown as WSContext,
      JSON.stringify({ type: 'setPattern', id: 'totally-not-a-pattern', params: {} }),
    );
    const after = patternMessages(out).length;

    expect(after).toBe(before); // nothing new relayed

    removeController(ctrl as unknown as WSContext);
    removeOutput(out as unknown as WSContext);
  });
});
