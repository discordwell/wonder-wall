import type { TestPattern } from '../types.js';

const PRESET_COLORS = [
  { label: 'Red', value: '#ff0000' },
  { label: 'Green', value: '#00ff00' },
  { label: 'Blue', value: '#0000ff' },
  { label: 'Cyan', value: '#00ffff' },
  { label: 'Magenta', value: '#ff00ff' },
  { label: 'Yellow', value: '#ffff00' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
];

export const solid: TestPattern = {
  id: 'solid',
  name: 'Solid Color',
  category: 'essential',
  description: 'Full screen solid color fill. Use for dead pixel detection and color uniformity checks.',
  parameters: [
    {
      key: 'color',
      label: 'Color',
      type: 'select',
      default: '#ff0000',
      options: PRESET_COLORS,
    },
  ],
  render(ctx, w, h, params) {
    const color = (params.color as string) ?? '#ff0000';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  },
};
