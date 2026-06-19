import type { TestPattern } from '../types.js';
import { getParam } from '../utils.js';

export const uniformityWhite: TestPattern = {
  id: 'uniformity-white',
  name: 'Uniformity White',
  category: 'advanced',
  description: 'Full white at selectable brightness levels for uniformity checks across the entire wall.',
  parameters: [
    { key: 'brightness', label: 'Brightness %', type: 'select', default: '100',
      options: [
        { label: '100%', value: '100' },
        { label: '75%', value: '75' },
        { label: '50%', value: '50' },
        { label: '25%', value: '25' },
        { label: '10%', value: '10' },
        { label: '5%', value: '5' },
      ],
    },
  ],
  render(ctx, w, h, params) {
    // getParam only enforces the *string* type, not that the string is numeric,
    // so a direct/library call with a non-numeric brightness makes parseInt
    // return NaN — which would leak `rgb(NaN,NaN,NaN)` (silently ignored by the
    // canvas, leaving the wall unfilled) and a literal "NaN% White" label.
    // sanitizeParams maps any invalid select back to a real option for the
    // app/server, but the pure function guards itself too (mirrors the
    // brightness-steps `steps === 1` guard).
    const raw = parseInt(getParam(params, 'brightness', '100'), 10);
    const pct = Number.isFinite(raw) ? raw : 100;
    const v = Math.round((pct / 100) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, 0, w, h);

    // Show brightness percentage in contrasting text
    ctx.fillStyle = v > 128 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${pct}% White (${v}/255)`, w / 2, h - 16);
  },
};
