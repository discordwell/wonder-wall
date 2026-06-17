import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from 'canvas';
import {
  getAllPatterns,
  getPattern,
  sanitizeParams,
  type TestPattern,
} from '@wonderwall/patterns';

/**
 * The /output page re-implements every pattern inline so the HDMI box needs no
 * build step (ARCHITECTURE.md decision #4). That duplication is a standing
 * drift risk: the sibling output-parity test only proves a renderer *exists*
 * for each id, not that it draws the same thing. This suite closes that gap by
 * rendering the package pattern and its inline twin onto two node-canvas
 * contexts and asserting the pixels are identical.
 *
 * node-canvas is deterministic, so identical draw-op streams produce
 * byte-identical output — a matching renderer diffs to exactly zero pixels.
 * Cosmetic source differences (hsl spacing, `#fff` vs `#ffffff`) collapse to
 * the same pixels and are correctly ignored; only a *visible* divergence
 * (a dropped label, a wrong colour, an off-by-rounding font size) trips it.
 */

interface InlinePattern {
  render(ctx: CanvasRenderingContext2D, w: number, h: number, p: Record<string, unknown>): void;
  animate?(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    p: Record<string, unknown>,
    t: number,
  ): void;
}

const outputHtml = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../output/index.html'),
  'utf8',
);

/**
 * Lift the inline `patterns` registry straight out of the output page's
 * <script> and evaluate it with no DOM. The renderers depend only on their
 * (ctx, w, h, params) args, `Math`, and a handful of const tables (BARS_*,
 * PLUGE, MARKER_BITS, drawArucoMarker) that sit directly above them — so the
 * slice from the first such table to the end of the `patterns` literal is a
 * self-contained program. If the page is restructured so this slice no longer
 * captures the renderers, extraction throws and the suite fails loudly, which
 * is the intended signal to re-point it.
 */
function extractInlinePatterns(): Record<string, InlinePattern> {
  const start = outputHtml.indexOf('const BARS_75');
  const block = /const patterns = \{[\s\S]*?\n {4}\};/.exec(outputHtml);
  if (start < 0 || !block) {
    throw new Error('output/index.html: could not locate the inline pattern renderers');
  }
  const code = outputHtml.slice(start, block.index + block[0].length);
  const factory = new Function(`${code}\nreturn patterns;`) as unknown as () => Record<
    string,
    InlinePattern
  >;
  return factory();
}

const inlinePatterns = extractInlinePatterns();

function renderToData(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w: number,
  h: number,
): Uint8ClampedArray {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  draw(ctx, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

/**
 * Count pixels whose largest channel delta exceeds `thr`. With deterministic
 * rendering the expectation is exactly zero; `max` is reported for triage.
 */
function diffPixels(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
  thr = 0,
): { count: number; max: number } {
  let count = 0;
  let max = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(
      Math.abs(a[i] - b[i]),
      Math.abs(a[i + 1] - b[i + 1]),
      Math.abs(a[i + 2] - b[i + 2]),
      Math.abs(a[i + 3] - b[i + 3]),
    );
    if (d > max) max = d;
    if (d > thr) count++;
  }
  return { count, max };
}

// A resolution with integer cell sizes for the default grids, plus two with
// fractional cell sizes (a round number and a common-but-awkward laptop panel).
// The fractional ones exercise rounding/parity of derived values — font sizes
// and label positions computed from cell/step dimensions, where round-of-sum vs
// sum-of-rounds and rounded-vs-unrounded mismatches actually surface.
const DIMS = [
  { w: 1280, h: 720 },
  { w: 1000, h: 700 },
  { w: 1366, h: 768 },
];

const ANIMATE_TIMES = [0, 333, 1500, 4000];

// Raw (pre-sanitize) param variations per pattern. `{}` (→ defaults) is always
// included; the extras target branches that change what gets drawn.
const PARAM_SETS: Record<string, Record<string, unknown>[]> = {
  'solid': [{}, { color: '#00ff00' }],
  'smpte-bars': [{}, { intensity: '100' }],
  'numbered-grid': [{}, { columns: 1, rows: 1 }, { columns: 6, rows: 5, showBorder: false }],
  'crosshatch': [{}, { spacing: 32, lineWidth: 3, lineColor: '#ff8800', bgColor: '#101820' }],
  'gradient': [{}, { steps: 1 }, { steps: 8 }, { channel: 'red', direction: 'vertical' }, { channel: 'blue', steps: 12 }],
  'aruco-grid': [{}, { columns: 1, rows: 1 }, { columns: 8, rows: 6, padding: 40 }],
  'sequential-flash': [{}, { columns: 1, rows: 1 }, { columns: 5, rows: 4, flashColor: '#00ffff' }],
  'pixel-walk': [{}, { dotSize: 1 }, { dotSize: 8, color: '#ff00aa', speed: 100 }],
  'color-wash': [{}, { speed: 5, saturation: 70, lightness: 40 }],
  'alignment-crosses': [{}, { armLength: 80, color: '#00ff88', bgColor: '#181818' }],
  'resolution-check': [{}, { blockSize: 4, color1: '#ff0000', color2: '#0000ff' }],
  'brightness-steps': [{}, { direction: 'vertical' }, { steps: 11, showLabels: false }],
  'custom-text': [{}, { text: 'STANDBY', fontSize: 180, showInfo: false }],
  'seam-finder': [{}, { columns: 1, rows: 1 }, { columns: 6, rows: 4, bandPct: 15, color1: '#ffcc00', color2: '#cc00ff' }],
  'motion-test': [{}, { direction: 'vertical', barWidth: 80, speed: 400 }],
  'uniformity-white': [{}, { brightness: '50' }, { brightness: '5' }],
};

describe('output page renderers match @wonderwall/patterns pixel-for-pixel', () => {
  const ids = getAllPatterns().map((p) => p.id);

  it.each(ids)(
    'renders %s identically to the package',
    (id) => {
      const pattern = getPattern(id) as TestPattern;
      const inline = inlinePatterns[id];
      expect(inline, `output/index.html has no inline renderer for '${id}'`).toBeTruthy();

      for (const raw of PARAM_SETS[id] ?? [{}]) {
        const params = sanitizeParams(pattern, raw);
        for (const { w, h } of DIMS) {
          if (pattern.animate) {
            // The output page drives animated patterns through animate(); its
            // static render() is a deliberately different still preview, so
            // animate() is the contract to check.
            expect(inline.animate, `inline '${id}' should expose animate()`).toBeTruthy();
            for (const t of ANIMATE_TIMES) {
              const pkg = renderToData((c, cw, ch) => pattern.animate!(c, cw, ch, params, t), w, h);
              const inl = renderToData((c, cw, ch) => inline.animate!(c, cw, ch, params, t), w, h);
              const { count, max } = diffPixels(pkg, inl);
              expect(
                count,
                `${id} animate(t=${t}) ${JSON.stringify(raw)} @${w}x${h}: ${count}px differ (maxΔ ${max})`,
              ).toBe(0);
            }
          } else {
            const pkg = renderToData((c, cw, ch) => pattern.render(c, cw, ch, params), w, h);
            const inl = renderToData((c, cw, ch) => inline.render(c, cw, ch, params), w, h);
            const { count, max } = diffPixels(pkg, inl);
            expect(
              count,
              `${id} render ${JSON.stringify(raw)} @${w}x${h}: ${count}px differ (maxΔ ${max})`,
            ).toBe(0);
          }
        }
      }
    },
    20000,
  );
});
