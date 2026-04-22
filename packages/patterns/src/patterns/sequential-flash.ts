import type { TestPattern } from '../types.js';
import { getParam } from '../utils.js';

export const sequentialFlash: TestPattern = {
  id: 'sequential-flash',
  name: 'Sequential Flash',
  category: 'essential',
  description: 'Flash each panel one at a time in sequence. Use after panel mapping to verify the mapping order visually.',
  parameters: [
    {
      key: 'columns',
      label: 'Columns',
      type: 'number',
      default: 4,
      min: 1,
      max: 20,
      step: 1,
    },
    {
      key: 'rows',
      label: 'Rows',
      type: 'number',
      default: 3,
      min: 1,
      max: 20,
      step: 1,
    },
    {
      key: 'speed',
      label: 'Speed (ms)',
      type: 'number',
      default: 1000,
      min: 200,
      max: 3000,
      step: 100,
    },
    {
      key: 'flashColor',
      label: 'Flash Color',
      type: 'color',
      default: '#ffffff',
    },
  ],
  render(ctx, w, h, params) {
    // Static render == animate at t=0, keeping the two paths in lockstep.
    sequentialFlash.animate!(ctx, w, h, params, 0);
  },

  animate(ctx, w, h, params, time) {
    const cols = getParam(params, 'columns', 4);
    const rows = getParam(params, 'rows', 3);
    const speed = getParam(params, 'speed', 1000);
    const flashColor = getParam(params, 'flashColor', '#ffffff');
    const totalCells = cols * rows;

    const activeIndex = Math.floor(time / speed) % totalCells;

    const cellW = w / cols;
    const cellH = h / rows;

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const x = Math.round(col * cellW);
        const y = Math.round(row * cellH);
        const cw = Math.round((col + 1) * cellW) - x;
        const ch = Math.round((row + 1) * cellH) - y;

        if (index === activeIndex) {
          // Active cell: full color
          ctx.fillStyle = flashColor;
          ctx.fillRect(x, y, cw, ch);

          // Label in contrasting color
          const fontSize = Math.min(cellW, cellH) * 0.3;
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`#${index}`, x + cw / 2, y + ch / 2);
        } else {
          // Inactive: dim border
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cw, ch);

          // Dim number
          const fontSize = Math.min(cellW, cellH) * 0.15;
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${index}`, x + cw / 2, y + ch / 2);
        }
      }
    }
  },
};
