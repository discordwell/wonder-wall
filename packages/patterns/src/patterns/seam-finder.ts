import type { TestPattern } from '../types.js';

export const seamFinder: TestPattern = {
  id: 'seam-finder',
  name: 'Seam Finder',
  category: 'advanced',
  description: 'Alternating color bands at panel boundaries. Misaligned panels will show broken or offset bands at seams.',
  parameters: [
    { key: 'columns', label: 'Panel Columns', type: 'number', default: 4, min: 1, max: 20, step: 1 },
    { key: 'rows', label: 'Panel Rows', type: 'number', default: 3, min: 1, max: 20, step: 1 },
    { key: 'bandPct', label: 'Band Size %', type: 'number', default: 8, min: 2, max: 25, step: 1 },
    { key: 'color1', label: 'Color 1', type: 'color', default: '#ff0000' },
    { key: 'color2', label: 'Color 2', type: 'color', default: '#00ff00' },
  ],
  render(ctx, w, h, params) {
    const cols = (params.columns as number) ?? 4;
    const rows = (params.rows as number) ?? 3;
    const bandPct = (params.bandPct as number) ?? 8;
    const c1 = (params.color1 as string) ?? '#ff0000';
    const c2 = (params.color2 as string) ?? '#00ff00';

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const cellW = w / cols;
    const cellH = h / rows;

    // Band width scales with the smaller cell dimension
    const bandW = Math.max(2, Math.round(Math.min(cellW, cellH) * bandPct / 100));

    // Draw alternating bands at each vertical seam
    for (let col = 1; col < cols; col++) {
      const x = Math.round(col * cellW);
      const bandCount = Math.ceil(h / bandW);
      for (let i = 0; i < bandCount; i++) {
        ctx.fillStyle = i % 2 === 0 ? c1 : c2;
        ctx.fillRect(x - bandW, i * bandW, bandW * 2, bandW);
      }
    }

    // Draw alternating bands at each horizontal seam
    for (let row = 1; row < rows; row++) {
      const y = Math.round(row * cellH);
      const bandCount = Math.ceil(w / bandW);
      for (let i = 0; i < bandCount; i++) {
        ctx.fillStyle = i % 2 === 0 ? c1 : c2;
        ctx.fillRect(i * bandW, y - bandW, bandW, bandW * 2);
      }
    }

    // Panel number labels (dimmed)
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    const fontSize = Math.min(cellW, cellH) * 0.15;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        ctx.fillText(`${row * cols + col + 1}`, cx, cy);
      }
    }
  },
};
