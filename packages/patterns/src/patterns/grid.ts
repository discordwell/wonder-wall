import type { TestPattern } from '../types.js';

export const numberedGrid: TestPattern = {
  id: 'numbered-grid',
  name: 'Numbered Grid',
  category: 'essential',
  description: 'Configurable grid with sequential numbers in each cell. Essential for panel identification — photograph the wall to map which output drives which panel.',
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
      key: 'showBorder',
      label: 'Show Borders',
      type: 'boolean',
      default: true,
    },
  ],
  render(ctx, w, h, params) {
    const cols = (params.columns as number) ?? 4;
    const rows = (params.rows as number) ?? 3;
    const showBorder = (params.showBorder as boolean) ?? true;

    const cellW = w / cols;
    const cellH = h / rows;

    // Generate distinct colors for each cell using HSL
    const totalCells = cols * rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const hue = (index * (360 / totalCells)) % 360;
        const x = Math.round(col * cellW);
        const y = Math.round(row * cellH);
        const cw = Math.round((col + 1) * cellW) - x;
        const ch = Math.round((row + 1) * cellH) - y;

        // Fill cell with distinct color
        ctx.fillStyle = `hsl(${hue}, 70%, 30%)`;
        ctx.fillRect(x, y, cw, ch);

        // Border
        if (showBorder) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
        }

        // Number label
        const label = String(index + 1);
        const fontSize = Math.min(cellW, cellH) * 0.4;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + cw / 2, y + ch / 2);

        // Small coordinate label
        const coordSize = Math.min(cellW, cellH) * 0.1;
        ctx.font = `${coordSize}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${col + 1},${row + 1}`, x + 6, y + 4);
      }
    }
  },
};
