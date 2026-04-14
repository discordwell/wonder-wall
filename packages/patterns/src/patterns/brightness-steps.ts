import type { TestPattern } from '../types.js';

export const brightnessSteps: TestPattern = {
  id: 'brightness-steps',
  name: 'Brightness Steps',
  category: 'professional',
  description: 'Stepped grayscale blocks from 0% to 100% for calibrating brightness levels. Includes near-black PLUGE-style steps.',
  parameters: [
    { key: 'steps', label: 'Steps', type: 'number', default: 21, min: 5, max: 41, step: 1 },
    { key: 'direction', label: 'Direction', type: 'select', default: 'horizontal',
      options: [{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }] },
    { key: 'showLabels', label: 'Show Labels', type: 'boolean', default: true },
  ],
  render(ctx, w, h, params) {
    const steps = (params.steps as number) ?? 21;
    const direction = (params.direction as string) ?? 'horizontal';
    const showLabels = (params.showLabels as boolean) ?? true;
    const isH = direction === 'horizontal';

    const size = isH ? w : h;
    const stepSize = size / steps;

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const v = Math.round(t * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;

      if (isH) {
        const x = Math.round(i * stepSize);
        const sw = Math.round((i + 1) * stepSize) - x;
        ctx.fillRect(x, 0, sw, h);
      } else {
        const y = Math.round(i * stepSize);
        const sh = Math.round((i + 1) * stepSize) - y;
        ctx.fillRect(0, y, w, sh);
      }

      if (showLabels) {
        const pct = Math.round(t * 100);
        const labelX = isH ? Math.round(i * stepSize) + Math.round(stepSize / 2) : w / 2;
        const labelY = isH ? h / 2 : Math.round(i * stepSize) + Math.round(stepSize / 2);

        // Contrasting label color
        ctx.fillStyle = v > 128 ? '#000' : '#fff';
        const fontSize = Math.min(isH ? stepSize * 0.4 : 14, 14);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pct}%`, labelX, labelY);
      }
    }
  },
};
