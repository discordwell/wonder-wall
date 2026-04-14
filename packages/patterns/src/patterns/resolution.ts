import type { TestPattern } from '../types.js';

export const resolutionCheck: TestPattern = {
  id: 'resolution-check',
  name: 'Resolution Check',
  category: 'professional',
  description: '1px checkerboard pattern to verify the wall runs at native resolution with no scaling artifacts.',
  parameters: [
    { key: 'blockSize', label: 'Block Size (px)', type: 'number', default: 1, min: 1, max: 8, step: 1 },
    { key: 'color1', label: 'Color 1', type: 'color', default: '#ffffff' },
    { key: 'color2', label: 'Color 2', type: 'color', default: '#000000' },
  ],
  render(ctx, w, h, params) {
    const size = (params.blockSize as number) ?? 1;
    const c1 = (params.color1 as string) ?? '#ffffff';
    const c2 = (params.color2 as string) ?? '#000000';

    // Fill background with color2
    ctx.fillStyle = c2;
    ctx.fillRect(0, 0, w, h);

    // Draw checkerboard with color1
    ctx.fillStyle = c1;
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        const col = Math.floor(x / size);
        const row = Math.floor(y / size);
        if ((col + row) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  },
};
