import type { TestPattern } from '../types.js';

/**
 * ArUco marker data for ARUCO_MIP_36h12 dictionary.
 * Each marker is a 6x6 grid of data bits, surrounded by a 1px black border
 * and a 1px white border (10x10 total). We store the 36-bit strings here
 * to avoid depending on js-aruco2 in the patterns package.
 *
 * We only need ~48 markers (max realistic panel count for a video wall).
 */
const MARKER_BITS: string[] = [
  '110100101011011000111010000010011101',
  '011000000000000100010011010011100101',
  '000100100000011011111011111001110010',
  '111001010110110000010100010100011100',
  '011010101001010011010100100000101110',
  '011010100010010111000101010011100001',
  '001100100110110011110001010001010010',
  '101000001101110101110101100101001010',
  '111000010011000010000010000111110100',
  '001110001100001010111001110100101010',
  '110101001110011111111110100000110010',
  '001001010000100001010010110111101001',
  '111100100110111010110010100011011110',
  '100011001000110010100101010100100101',
  '110011010011110100000111110001010001',
  '010010101101001001100010010010001011',
  '100001000111000100011100010001110001',
  '110010010101001010011111001001100001',
  '001100001001010100101100101010100000',
  '101010000100101000011111110100101011',
  '011011000010110100100100010001100010',
  '010110100001001010101101100100011110',
  '010001001001111000001011100010010100',
  '001010010101111110100001101100001000',
  '010001101100101001001110110011001001',
  '001010100100010001011011000010000111',
  '011110101010110101101010010011111100',
  '001010111010001110100001001000000011',
  '011011010100010010100101000100000001',
  '111101110100101011001110010010111110',
  '001111110010000000000111000100000111',
  '100000010010010101110011100100001010',
  '010000011100010110111000011010010110',
  '001101101010001000100010110010010010',
  '110010100000100100010101001011010011',
  '111101100101111011001001100100010001',
  '010001110011101001011000000010100001',
  '101010001001111001001111011110111100',
  '001100111011011001011001110111010110',
  '101100101011001001101110110010011001',
  '010100110000101001111001100000100011',
  '100001001010011111001001011000001000',
  '011001010011010100111000101110101111',
  '011010010010100110101010001100010110',
  '111010110010111110010010110011101001',
  '111111000000110011010111010100100010',
  '101110100110010000110101100110111010',
  '111001100011100001001001000101101110',
];

const MARKER_SIZE = 10; // 10x10 pixels per marker (1 white border + 1 black border + 6x6 data)

function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  markerId: number,
) {
  const bits = MARKER_BITS[markerId];
  if (!bits) return;

  const pixelSize = cellSize / MARKER_SIZE;

  // White background (outer border)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, cellSize, cellSize);

  // Black border (1px inside white border)
  ctx.fillStyle = '#000000';
  ctx.fillRect(
    x + pixelSize,
    y + pixelSize,
    cellSize - 2 * pixelSize,
    cellSize - 2 * pixelSize,
  );

  // Data bits (6x6 grid, starting at offset 2,2)
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const bitIndex = row * 6 + col;
      if (bits[bitIndex] === '1') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
          x + (col + 2) * pixelSize,
          y + (row + 2) * pixelSize,
          pixelSize,
          pixelSize,
        );
      }
    }
  }
}

export const arucoGrid: TestPattern = {
  id: 'aruco-grid',
  name: 'Panel ID Markers',
  category: 'essential',
  description: 'ArUco marker grid for camera-assisted panel identification. Display on the wall, photograph with your phone camera, and auto-map which panel is which.',
  parameters: [
    {
      key: 'columns',
      label: 'Columns',
      type: 'number',
      default: 4,
      min: 1,
      max: 8,
      step: 1,
    },
    {
      key: 'rows',
      label: 'Rows',
      type: 'number',
      default: 3,
      min: 1,
      max: 6,
      step: 1,
    },
    {
      key: 'padding',
      label: 'Padding %',
      type: 'number',
      default: 15,
      min: 5,
      max: 40,
      step: 5,
    },
  ],
  render(ctx, w, h, params) {
    const cols = (params.columns as number) ?? 4;
    const rows = (params.rows as number) ?? 3;
    const paddingPct = (params.padding as number) ?? 15;

    // White background for maximum contrast
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const cellW = w / cols;
    const cellH = h / rows;

    // Marker size: fit within cell with padding
    const paddingFrac = paddingPct / 100;
    const markerSize = Math.min(cellW, cellH) * (1 - paddingFrac);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        if (index >= MARKER_BITS.length) break;

        // Center marker in cell
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        const mx = cx - markerSize / 2;
        const my = cy - markerSize / 2;

        drawMarker(ctx, mx, my, markerSize, index);

        // Label below marker
        const labelSize = markerSize * 0.12;
        ctx.font = `bold ${labelSize}px sans-serif`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`#${index}`, cx, my + markerSize + 4);
      }
    }
  },
};
