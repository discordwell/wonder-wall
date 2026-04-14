import type { TestPattern } from '../types.js';

export const motionTest: TestPattern = {
  id: 'motion-test',
  name: 'Motion Test',
  category: 'advanced',
  description: 'Moving bars at configurable speed. Tests refresh rate and reveals motion artifacts or tearing.',
  parameters: [
    { key: 'barWidth', label: 'Bar Width (px)', type: 'number', default: 40, min: 4, max: 200, step: 4 },
    { key: 'speed', label: 'Speed (px/sec)', type: 'number', default: 200, min: 50, max: 2000, step: 50 },
    { key: 'direction', label: 'Direction', type: 'select', default: 'horizontal',
      options: [
        { label: 'Horizontal', value: 'horizontal' },
        { label: 'Vertical', value: 'vertical' },
      ],
    },
    { key: 'color', label: 'Bar Color', type: 'color', default: '#ffffff' },
  ],
  render(ctx, w, h, params) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const barW = (params.barWidth as number) ?? 40;
    const color = (params.color as string) ?? '#ffffff';
    const isH = (params.direction as string) === 'horizontal';
    ctx.fillStyle = color;
    if (isH) {
      ctx.fillRect(0, 0, barW, h);
    } else {
      ctx.fillRect(0, 0, w, barW);
    }
  },
  animate(ctx, w, h, params, time) {
    const barW = (params.barWidth as number) ?? 40;
    const speed = (params.speed as number) ?? 200;
    const color = (params.color as string) ?? '#ffffff';
    const isH = (params.direction as string) !== 'vertical';

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const size = isH ? w : h;
    const spacing = barW * 3;
    const offset = (time / 1000 * speed) % spacing;

    ctx.fillStyle = color;
    if (isH) {
      for (let x = -barW + offset; x < w; x += spacing) {
        ctx.fillRect(x, 0, barW, h);
      }
    } else {
      for (let y = -barW + offset; y < h; y += spacing) {
        ctx.fillRect(0, y, w, barW);
      }
    }
  },
};
