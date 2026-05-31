import { describe, it, expect } from 'vitest';
import { sizeCanvasToDevicePixels } from '../lib/services/canvas.ts';

describe('sizeCanvasToDevicePixels', () => {
  it('scales the backing store up by devicePixelRatio', () => {
    const canvas = { width: 0, height: 0 };
    const dims = sizeCanvasToDevicePixels(canvas, 100, 50, 2);
    expect(dims).toEqual({ width: 200, height: 100 });
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
  });

  it('is 1:1 when dpr is 1 (so a 1px pattern is one physical pixel)', () => {
    const canvas = { width: 0, height: 0 };
    const dims = sizeCanvasToDevicePixels(canvas, 1920, 1080, 1);
    expect(dims).toEqual({ width: 1920, height: 1080 });
  });

  it('rounds fractional device pixels', () => {
    const canvas = { width: 0, height: 0 };
    const dims = sizeCanvasToDevicePixels(canvas, 100, 100, 2.5);
    expect(dims).toEqual({ width: 250, height: 250 });
  });

  it('never produces a zero-sized canvas', () => {
    const canvas = { width: 0, height: 0 };
    const dims = sizeCanvasToDevicePixels(canvas, 0, 0, 1);
    expect(dims).toEqual({ width: 1, height: 1 });
  });

  it('falls back to ratio 1 for a non-positive dpr', () => {
    const canvas = { width: 0, height: 0 };
    const dims = sizeCanvasToDevicePixels(canvas, 100, 100, 0);
    expect(dims).toEqual({ width: 100, height: 100 });
  });
});
