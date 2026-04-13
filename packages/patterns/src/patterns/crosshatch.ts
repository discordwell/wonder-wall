import type { TestPattern } from '../types.js';

export const crosshatch: TestPattern = {
  id: 'crosshatch',
  name: 'Crosshatch',
  category: 'essential',
  description: 'Grid lines for checking panel alignment and verifying geometry. Misaligned panels will show broken lines at seams.',
  parameters: [
    {
      key: 'spacing',
      label: 'Line Spacing (px)',
      type: 'number',
      default: 64,
      min: 8,
      max: 512,
      step: 8,
    },
    {
      key: 'lineColor',
      label: 'Line Color',
      type: 'color',
      default: '#ffffff',
    },
    {
      key: 'bgColor',
      label: 'Background',
      type: 'color',
      default: '#000000',
    },
    {
      key: 'lineWidth',
      label: 'Line Width',
      type: 'number',
      default: 1,
      min: 1,
      max: 8,
      step: 1,
    },
  ],
  render(ctx, w, h, params) {
    const spacing = (params.spacing as number) ?? 64;
    const lineColor = (params.lineColor as string) ?? '#ffffff';
    const bgColor = (params.bgColor as string) ?? '#000000';
    const lineWidth = (params.lineWidth as number) ?? 1;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    const offset = lineWidth % 2 === 1 ? 0.5 : 0;

    // Vertical lines
    for (let x = 0; x <= w; x += spacing) {
      ctx.moveTo(x + offset, 0);
      ctx.lineTo(x + offset, h);
    }

    // Horizontal lines
    for (let y = 0; y <= h; y += spacing) {
      ctx.moveTo(0, y + offset);
      ctx.lineTo(w, y + offset);
    }

    ctx.stroke();

    // Center crosshair (thicker)
    const centerWidth = lineWidth + 2;
    const centerOffset = centerWidth % 2 === 1 ? 0.5 : 0;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = centerWidth;
    ctx.beginPath();
    ctx.moveTo(w / 2 + centerOffset, 0);
    ctx.lineTo(w / 2 + centerOffset, h);
    ctx.moveTo(0, h / 2 + centerOffset);
    ctx.lineTo(w, h / 2 + centerOffset);
    ctx.stroke();
  },
};
