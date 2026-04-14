import type { TestPattern } from '../types.js';

export const alignmentCrosses: TestPattern = {
  id: 'alignment-crosses',
  name: 'Alignment Crosses',
  category: 'professional',
  description: 'Crosshairs at center, corners, and midpoints for checking physical panel alignment.',
  parameters: [
    { key: 'color', label: 'Color', type: 'color', default: '#ffffff' },
    { key: 'bgColor', label: 'Background', type: 'color', default: '#000000' },
    { key: 'armLength', label: 'Arm Length', type: 'number', default: 40, min: 10, max: 200, step: 5 },
  ],
  render(ctx, w, h, params) {
    const color = (params.color as string) ?? '#ffffff';
    const bg = (params.bgColor as string) ?? '#000000';
    const arm = (params.armLength as number) ?? 40;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const points = [
      [w / 2, h / 2],       // Center
      [0, 0],               // Top-left
      [w, 0],               // Top-right
      [0, h],               // Bottom-left
      [w, h],               // Bottom-right
      [w / 2, 0],           // Top-center
      [w / 2, h],           // Bottom-center
      [0, h / 2],           // Left-center
      [w, h / 2],           // Right-center
      [w / 4, h / 4],       // Quarter points
      [3 * w / 4, h / 4],
      [w / 4, 3 * h / 4],
      [3 * w / 4, 3 * h / 4],
    ];

    for (const [cx, cy] of points) {
      ctx.beginPath();
      ctx.moveTo(cx - arm, cy);
      ctx.lineTo(cx + arm, cy);
      ctx.moveTo(cx, cy - arm);
      ctx.lineTo(cx, cy + arm);
      ctx.stroke();

      // Small circle at intersection
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  },
};
