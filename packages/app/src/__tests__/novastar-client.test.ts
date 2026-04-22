import { describe, it, expect } from 'vitest';
import {
  createDefaultNovastarState,
  handleNovastarResult,
} from '../lib/services/novastar-client.ts';
import type { NovastarResultMessage } from '@wonderwall/patterns';

function msg(overrides: Partial<NovastarResultMessage> & { action: string }): NovastarResultMessage {
  return { type: 'novastarResult', ...overrides } as NovastarResultMessage;
}

describe('handleNovastarResult reducer', () => {
  const initial = createDefaultNovastarState();

  it('connect result populates connection fields', () => {
    const out = handleNovastarResult(
      msg({ action: 'connect', connected: true, modelId: 42, wall: {
        totalWidth: 1920, totalHeight: 1080, columns: 2, rows: 1,
        cabinetWidth: 960, cabinetHeight: 1080,
      } }),
      initial,
    );
    expect(out.connected).toBe(true);
    expect(out.modelId).toBe(42);
    expect(out.wall?.columns).toBe(2);
    expect(out.error).toBeNull();
  });

  it('disconnect result resets state', () => {
    const connected = handleNovastarResult(
      msg({ action: 'connect', connected: true, modelId: 99, wall: null }),
      initial,
    );
    const out = handleNovastarResult(msg({ action: 'disconnect' }), connected);
    expect(out).toEqual(createDefaultNovastarState());
  });

  it('setBrightness merges new channels and preserves others', () => {
    const out = handleNovastarResult(
      msg({ action: 'setBrightness', global: 200, red: 255, green: 128, blue: 64 }),
      initial,
    );
    expect(out.brightness).toEqual({ global: 200, red: 255, green: 128, blue: 64 });
  });

  it('setBrightness missing a channel falls back to prior value (not NaN)', () => {
    const warmed = handleNovastarResult(
      msg({ action: 'setBrightness', global: 100, red: 100, green: 100, blue: 100 }),
      initial,
    );
    const out = handleNovastarResult(
      msg({ action: 'setBrightness', global: 50 }), // only global provided
      warmed,
    );
    expect(out.brightness.global).toBe(50);
    expect(out.brightness.red).toBe(100);
    expect(out.brightness.green).toBe(100);
    expect(out.brightness.blue).toBe(100);
  });

  it('getWallConfig builds wall when columns present; ignores when absent', () => {
    const withWall = handleNovastarResult(
      msg({
        action: 'getWallConfig',
        totalWidth: 3840, totalHeight: 2160,
        columns: 4, rows: 2,
        cabinetWidth: 960, cabinetHeight: 1080,
      }),
      initial,
    );
    expect(withWall.wall).toEqual({
      totalWidth: 3840, totalHeight: 2160,
      columns: 4, rows: 2,
      cabinetWidth: 960, cabinetHeight: 1080,
    });

    const prior = { ...initial, wall: withWall.wall };
    const withoutCols = handleNovastarResult(
      msg({ action: 'getWallConfig', error: '' as string | undefined }),
      prior,
    );
    // No error, no columns → keep previous wall
    expect(withoutCols.wall).toEqual(withWall.wall);
  });

  it('error field short-circuits to error state', () => {
    const out = handleNovastarResult(msg({ action: 'connect', error: 'refused' }), initial);
    expect(out.error).toBe('refused');
    expect(out.connected).toBe(false); // unchanged
  });

  it('unknown actions clear prior error but do not crash', () => {
    const errored = { ...initial, error: 'prev' };
    const out = handleNovastarResult(msg({ action: 'something-future' }), errored);
    expect(out.error).toBeNull();
  });
});
