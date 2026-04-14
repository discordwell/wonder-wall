import type { TestPattern } from '../types.js';

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
    const pct = parseInt((params.brightness as string) ?? '100', 10);
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
