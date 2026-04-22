import { describe, it, expect } from 'vitest';
import {
  getPattern,
  getAllPatterns,
  getDefaultParams,
  renderPattern,
  getParam,
  parseClientMessage,
  parseServerMessage,
} from '../index.js';
import { createTestCanvas, getPixel, pixelMatches } from './helpers.js';

describe('protocol parsers', () => {
  it('accepts valid client message types', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'setPattern', id: 'solid', params: {} }))?.type)
      .toBe('setPattern');
    expect(parseClientMessage(JSON.stringify({ type: 'novastar', action: 'connect', host: '1.2.3.4' }))?.type)
      .toBe('novastar');
  });

  it('rejects unknown client message types', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'hack', payload: 'x' }))).toBeNull();
    expect(parseClientMessage('{')).toBeNull();
    expect(parseClientMessage(JSON.stringify('just a string'))).toBeNull();
  });

  it('accepts valid server message types', () => {
    expect(parseServerMessage(JSON.stringify({ type: 'pattern', id: 'solid', params: {} }))?.type)
      .toBe('pattern');
    expect(parseServerMessage(JSON.stringify({
      type: 'status', outputClients: 1, currentPattern: null,
      novastar: { connected: false, wall: null },
    }))?.type).toBe('status');
    expect(parseServerMessage(JSON.stringify({
      type: 'novastarResult', action: 'getBrightness', global: 200,
    }))?.type).toBe('novastarResult');
  });

  it('rejects unknown server message types', () => {
    expect(parseServerMessage(JSON.stringify({ type: 'unknown' }))).toBeNull();
    expect(parseServerMessage('not json')).toBeNull();
  });
});

describe('getParam', () => {
  it('returns the value when types match', () => {
    expect(getParam({ a: 4 }, 'a', 0)).toBe(4);
    expect(getParam({ a: 'x' }, 'a', 'y')).toBe('x');
    expect(getParam({ a: false }, 'a', true)).toBe(false);
  });

  it('falls back when key is missing', () => {
    expect(getParam({}, 'a', 42)).toBe(42);
    expect(getParam({}, 'a', 'def')).toBe('def');
  });

  it('falls back when type mismatches (guards against malformed WS params)', () => {
    // A stringified number relayed by a misbehaving client must not reach
    // canvas math as NaN — we want the default instead.
    expect(getParam({ cols: '4' }, 'cols', 10)).toBe(10);
    expect(getParam({ active: 'true' }, 'active', false)).toBe(false);
    expect(getParam({ label: 99 }, 'label', 'fallback')).toBe('fallback');
  });
});

describe('registry', () => {
  it('has all 16 patterns registered', () => {
    const all = getAllPatterns();
    expect(all.length).toBe(16);
    const ids = all.map((p) => p.id);
    // Tier 1
    expect(ids).toContain('solid');
    expect(ids).toContain('smpte-bars');
    expect(ids).toContain('numbered-grid');
    expect(ids).toContain('crosshatch');
    expect(ids).toContain('gradient');
    expect(ids).toContain('aruco-grid');
    expect(ids).toContain('sequential-flash');
    // Tier 2
    expect(ids).toContain('pixel-walk');
    expect(ids).toContain('color-wash');
    expect(ids).toContain('alignment-crosses');
    expect(ids).toContain('resolution-check');
    expect(ids).toContain('brightness-steps');
    // Tier 3
    expect(ids).toContain('custom-text');
    expect(ids).toContain('seam-finder');
    expect(ids).toContain('motion-test');
    expect(ids).toContain('uniformity-white');
  });

  it('returns undefined for unknown pattern', () => {
    expect(getPattern('nonexistent')).toBeUndefined();
  });

  it('generates default params for each pattern', () => {
    for (const pattern of getAllPatterns()) {
      const params = getDefaultParams(pattern);
      for (const p of pattern.parameters) {
        expect(params[p.key]).toBe(p.default);
      }
    }
  });
});

describe('solid pattern', () => {
  it('fills entire canvas with red', () => {
    const { ctx, width, height } = createTestCanvas();
    const pattern = getPattern('solid')!;
    renderPattern({ pattern, ctx, width, height, params: { color: '#ff0000' } });

    // Check corners and center
    expect(pixelMatches(getPixel(ctx, 0, 0), [255, 0, 0])).toBe(true);
    expect(pixelMatches(getPixel(ctx, width - 1, 0), [255, 0, 0])).toBe(true);
    expect(pixelMatches(getPixel(ctx, 0, height - 1), [255, 0, 0])).toBe(true);
    expect(pixelMatches(getPixel(ctx, width - 1, height - 1), [255, 0, 0])).toBe(true);
    expect(pixelMatches(getPixel(ctx, width / 2, height / 2), [255, 0, 0])).toBe(true);
  });

  it('fills with white', () => {
    const { ctx, width, height } = createTestCanvas();
    const pattern = getPattern('solid')!;
    renderPattern({ pattern, ctx, width, height, params: { color: '#ffffff' } });
    expect(pixelMatches(getPixel(ctx, 0, 0), [255, 255, 255])).toBe(true);
  });

  it('fills with black', () => {
    const { ctx, width, height } = createTestCanvas();
    const pattern = getPattern('solid')!;
    renderPattern({ pattern, ctx, width, height, params: { color: '#000000' } });
    expect(pixelMatches(getPixel(ctx, 0, 0), [0, 0, 0])).toBe(true);
  });
});

describe('SMPTE bars', () => {
  it('renders 75% bars with correct first bar color (gray)', () => {
    const { ctx, width, height } = createTestCanvas(700, 400);
    const pattern = getPattern('smpte-bars')!;
    renderPattern({ pattern, ctx, width, height, params: { intensity: '75' } });

    // First bar should be 75% white (0xc0 = 192)
    const pixel = getPixel(ctx, 10, 10);
    expect(pixelMatches(pixel, [192, 192, 192])).toBe(true);
  });

  it('renders 100% bars with white first bar', () => {
    const { ctx, width, height } = createTestCanvas(700, 400);
    const pattern = getPattern('smpte-bars')!;
    renderPattern({ pattern, ctx, width, height, params: { intensity: '100' } });

    const pixel = getPixel(ctx, 10, 10);
    expect(pixelMatches(pixel, [255, 255, 255])).toBe(true);
  });

  it('renders at various resolutions without errors', () => {
    const pattern = getPattern('smpte-bars')!;
    const sizes = [[1920, 1080], [3840, 2160], [1280, 720], [800, 600]];
    for (const [w, h] of sizes) {
      const { ctx } = createTestCanvas(w, h);
      expect(() => {
        renderPattern({ pattern, ctx, width: w, height: h, params: { intensity: '75' } });
      }).not.toThrow();
    }
  });
});

describe('numbered grid', () => {
  it('renders with default params without error', () => {
    const { ctx, width, height } = createTestCanvas();
    const pattern = getPattern('numbered-grid')!;
    const params = getDefaultParams(pattern);
    expect(() => {
      renderPattern({ pattern, ctx, width, height, params });
    }).not.toThrow();
  });

  it('renders distinct cells with different colors', () => {
    const { ctx, width, height } = createTestCanvas(400, 300);
    const pattern = getPattern('numbered-grid')!;
    renderPattern({ pattern, ctx, width, height, params: { columns: 2, rows: 2, showBorder: true } });

    // Top-left and top-right cells should have different colors
    const topLeft = getPixel(ctx, 10, 10);
    const topRight = getPixel(ctx, 300, 10);
    const differ = topLeft[0] !== topRight[0] || topLeft[1] !== topRight[1] || topLeft[2] !== topRight[2];
    expect(differ).toBe(true);
  });
});

describe('crosshatch', () => {
  it('has black background and white lines at origin', () => {
    const { ctx, width, height } = createTestCanvas(256, 256);
    const pattern = getPattern('crosshatch')!;
    renderPattern({
      pattern,
      ctx,
      width,
      height,
      params: { spacing: 64, lineColor: '#ffffff', bgColor: '#000000', lineWidth: 1 },
    });

    // Origin should be on a grid line intersection (white)
    const origin = getPixel(ctx, 0, 0);
    expect(pixelMatches(origin, [255, 255, 255])).toBe(true);

    // Middle of a cell should be black
    const mid = getPixel(ctx, 32, 32);
    expect(pixelMatches(mid, [0, 0, 0])).toBe(true);
  });
});

describe('gradient', () => {
  it('renders horizontal grayscale with black on left and white on right', () => {
    const { ctx, width, height } = createTestCanvas(256, 100);
    const pattern = getPattern('gradient')!;
    renderPattern({
      pattern,
      ctx,
      width,
      height,
      params: { channel: 'grayscale', direction: 'horizontal', steps: 0 },
    });

    const left = getPixel(ctx, 0, 50);
    const right = getPixel(ctx, 255, 50);

    // Left should be dark, right should be bright
    expect(left[0]).toBeLessThan(20);
    expect(right[0]).toBeGreaterThan(235);
  });

  it('renders stepped gradient with correct number of steps', () => {
    const { ctx, width, height } = createTestCanvas(400, 100);
    const pattern = getPattern('gradient')!;
    renderPattern({
      pattern,
      ctx,
      width,
      height,
      params: { channel: 'grayscale', direction: 'horizontal', steps: 4 },
    });

    // With 4 steps over 400px, each step is 100px
    // First step should be black (t=0)
    const step0 = getPixel(ctx, 10, 50);
    expect(step0[0]).toBeLessThan(5);

    // Last step should be white (t=1)
    const step3 = getPixel(ctx, 390, 50);
    expect(step3[0]).toBeGreaterThan(250);
  });

  it('renders red channel gradient', () => {
    const { ctx, width, height } = createTestCanvas(256, 100);
    const pattern = getPattern('gradient')!;
    renderPattern({
      pattern,
      ctx,
      width,
      height,
      params: { channel: 'red', direction: 'horizontal', steps: 0 },
    });

    const right = getPixel(ctx, 255, 50);
    expect(right[0]).toBeGreaterThan(235); // Red channel high
    expect(right[1]).toBeLessThan(5);      // Green channel low
    expect(right[2]).toBeLessThan(5);      // Blue channel low
  });
});

describe('aruco grid', () => {
  it('is registered in the pattern list', () => {
    expect(getPattern('aruco-grid')).toBeDefined();
  });

  it('renders with white background', () => {
    const { ctx, width, height } = createTestCanvas(400, 300);
    const pattern = getPattern('aruco-grid')!;
    renderPattern({ pattern, ctx, width, height, params: { columns: 2, rows: 2, padding: 15 } });

    // Corners should be white (background)
    expect(pixelMatches(getPixel(ctx, 0, 0), [255, 255, 255])).toBe(true);
  });

  it('renders markers with black border areas', () => {
    const { ctx, width, height } = createTestCanvas(400, 300);
    const pattern = getPattern('aruco-grid')!;
    renderPattern({ pattern, ctx, width, height, params: { columns: 2, rows: 2, padding: 15 } });

    // Center of first cell should have a marker (contains black pixels)
    const center = getPixel(ctx, 100, 75);
    // Should be either black or white (marker data)
    const isBW = (center[0] < 10 && center[1] < 10 && center[2] < 10) ||
                 (center[0] > 245 && center[1] > 245 && center[2] > 245);
    expect(isBW).toBe(true);
  });

  it('does not error when cell count exceeds marker bank (labels remain)', () => {
    // Network-relayed params can exceed the UI's 8x6 limit; the pattern must
    // remain safe and still identify cells beyond the marker bank by label.
    const { ctx, width, height } = createTestCanvas(1200, 900);
    const pattern = getPattern('aruco-grid')!;
    expect(() =>
      renderPattern({
        pattern,
        ctx,
        width,
        height,
        params: { columns: 10, rows: 8, padding: 15 }, // 80 > 48
      }),
    ).not.toThrow();

    // Overflow cell should still have non-white content (the label).
    // Cell (col=9, row=7) center is at (1140, 787.5). Sample near-center to
    // find at least one dark pixel where the label sits.
    const cellW = 120, cellH = 112.5;
    const cx = Math.floor(9 * cellW + cellW / 2);
    // Label is below the (missing) marker, centered at cx, sits near the
    // lower portion of the cell.
    const labelY = Math.floor(7 * cellH + cellH * 0.85);
    let darkFound = false;
    for (let dx = -30; dx <= 30 && !darkFound; dx++) {
      for (let dy = -10; dy <= 20; dy++) {
        const px = getPixel(ctx, Math.max(0, cx + dx), Math.max(0, labelY + dy));
        if (px[0] < 50 && px[1] < 50 && px[2] < 50) { darkFound = true; break; }
      }
    }
    expect(darkFound, 'overflow cell has no visible label').toBe(true);
  });
});

describe('sequential flash', () => {
  it('is registered in the pattern list', () => {
    expect(getPattern('sequential-flash')).toBeDefined();
  });

  it('renders static with first cell highlighted', () => {
    const { ctx, width, height } = createTestCanvas(400, 300);
    const pattern = getPattern('sequential-flash')!;
    renderPattern({
      pattern,
      ctx,
      width,
      height,
      params: { columns: 4, rows: 3, speed: 1000, flashColor: '#ffffff' },
    });

    // First cell should be white (highlighted)
    expect(pixelMatches(getPixel(ctx, 10, 10), [255, 255, 255])).toBe(true);

    // A cell not in the first position should be black (center of cell at col 2, row 1)
    expect(pixelMatches(getPixel(ctx, 250, 150), [0, 0, 0])).toBe(true);
  });

  it('animates without error', () => {
    const { ctx, width, height } = createTestCanvas(400, 300);
    const pattern = getPattern('sequential-flash')!;
    expect(pattern.animate).toBeDefined();
    expect(() => {
      pattern.animate!(ctx, width, height, { columns: 4, rows: 3, speed: 1000, flashColor: '#ffffff' }, 0);
      pattern.animate!(ctx, width, height, { columns: 4, rows: 3, speed: 1000, flashColor: '#ffffff' }, 1500);
    }).not.toThrow();
  });
});

describe('custom text', () => {
  it('renders text on black background', () => {
    const { ctx, width, height } = createTestCanvas(400, 200);
    const pattern = getPattern('custom-text')!;
    renderPattern({ pattern, ctx, width, height, params: { text: 'TEST', fontSize: 60, color: '#ffffff', bgColor: '#000000', showInfo: false } });
    // Background should be black at corners
    expect(pixelMatches(getPixel(ctx, 0, 0), [0, 0, 0])).toBe(true);
  });
});

describe('seam finder', () => {
  it('renders without error at various grid sizes', () => {
    const pattern = getPattern('seam-finder')!;
    for (const [c, r] of [[2, 2], [4, 3], [8, 6]]) {
      const { ctx, width, height } = createTestCanvas(400, 300);
      expect(() => renderPattern({ pattern, ctx, width, height, params: { columns: c, rows: r, bandWidth: 8, color1: '#ff0000', color2: '#00ff00' } })).not.toThrow();
    }
  });
});

describe('motion test', () => {
  it('animates without error', () => {
    const pattern = getPattern('motion-test')!;
    const { ctx, width, height } = createTestCanvas(400, 300);
    expect(pattern.animate).toBeDefined();
    expect(() => pattern.animate!(ctx, width, height, { barWidth: 40, speed: 200, direction: 'horizontal', color: '#ffffff' }, 500)).not.toThrow();
  });
});

describe('uniformity white', () => {
  it('renders 50% white correctly', () => {
    const { ctx, width, height } = createTestCanvas(200, 200);
    const pattern = getPattern('uniformity-white')!;
    renderPattern({ pattern, ctx, width, height, params: { brightness: '50' } });
    const pixel = getPixel(ctx, 100, 100);
    // 50% of 255 = 128
    expect(Math.abs(pixel[0] - 128)).toBeLessThan(3);
  });

  it('renders 100% as pure white', () => {
    const { ctx, width, height } = createTestCanvas(200, 200);
    const pattern = getPattern('uniformity-white')!;
    renderPattern({ pattern, ctx, width, height, params: { brightness: '100' } });
    const pixel = getPixel(ctx, 100, 10);
    expect(pixel[0]).toBeGreaterThan(250);
  });
});

describe('renderPattern', () => {
  it('clears canvas before rendering', () => {
    const { ctx, width, height } = createTestCanvas();

    // Fill with green first
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, 0, width, height);

    // Render solid red
    const pattern = getPattern('solid')!;
    renderPattern({ pattern, ctx, width, height, params: { color: '#ff0000' } });

    // Should be red, not green
    expect(pixelMatches(getPixel(ctx, 0, 0), [255, 0, 0])).toBe(true);
  });
});
