import type { TestPattern } from '../types.js';
import { getParam } from '../utils.js';

export const colorWash: TestPattern = {
  id: 'color-wash',
  name: 'Color Wash',
  category: 'professional',
  description: 'Smooth animated transition through the hue spectrum. Reveals color inconsistencies between panels.',
  parameters: [
    { key: 'speed', label: 'Cycle (sec)', type: 'number', default: 10, min: 2, max: 60, step: 1 },
    { key: 'saturation', label: 'Saturation %', type: 'number', default: 100, min: 0, max: 100, step: 5 },
    { key: 'lightness', label: 'Lightness %', type: 'number', default: 50, min: 10, max: 90, step: 5 },
  ],
  render(ctx, w, h, params) {
    const sat = getParam(params, 'saturation', 100);
    const light = getParam(params, 'lightness', 50);
    ctx.fillStyle = `hsl(0, ${sat}%, ${light}%)`;
    ctx.fillRect(0, 0, w, h);
  },
  animate(ctx, w, h, params, time) {
    const cycleSec = getParam(params, 'speed', 10);
    const sat = getParam(params, 'saturation', 100);
    const light = getParam(params, 'lightness', 50);
    const hue = (time / (cycleSec * 1000)) * 360 % 360;
    ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
    ctx.fillRect(0, 0, w, h);
  },
};
