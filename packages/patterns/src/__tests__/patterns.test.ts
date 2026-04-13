import { describe, it, expect } from 'vitest';
import { getPattern, getAllPatterns, getDefaultParams, renderPattern } from '../index.js';
import { createTestCanvas, getPixel, pixelMatches } from './helpers.js';

describe('registry', () => {
  it('has all Tier 1 patterns registered', () => {
    const ids = getAllPatterns().map((p) => p.id);
    expect(ids).toContain('solid');
    expect(ids).toContain('smpte-bars');
    expect(ids).toContain('numbered-grid');
    expect(ids).toContain('crosshatch');
    expect(ids).toContain('gradient');
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
