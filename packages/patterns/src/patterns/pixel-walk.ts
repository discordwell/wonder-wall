import type { TestPattern } from '../types.js';
import { getParam } from '../utils.js';

export const pixelWalk: TestPattern = {
  id: 'pixel-walk',
  name: 'Pixel Walk',
  category: 'professional',
  description: 'A lit pixel steps across the wall pixel by pixel, revealing dead pixels that solid colors miss.',
  parameters: [
    { key: 'dotSize', label: 'Dot Size (px)', type: 'number', default: 4, min: 1, max: 32, step: 1 },
    { key: 'speed', label: 'Speed', type: 'number', default: 50, min: 10, max: 500, step: 10 },
    { key: 'color', label: 'Color', type: 'color', default: '#ffffff' },
  ],
  render(ctx, w, h, params) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = getParam(params, 'color', '#ffffff');
    const size = getParam(params, 'dotSize', 4);
    ctx.fillRect(0, 0, size, size);
  },
  animate(ctx, w, h, params, time) {
    const size = getParam(params, 'dotSize', 4);
    const speed = getParam(params, 'speed', 50);
    const color = getParam(params, 'color', '#ffffff');

    const cols = Math.ceil(w / size);
    const rows = Math.ceil(h / size);
    const total = cols * rows;
    const idx = Math.floor(time / speed) % total;
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(col * size, row * size, size, size);
  },
};
