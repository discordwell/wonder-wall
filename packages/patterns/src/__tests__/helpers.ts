import { createCanvas } from 'canvas';

export function createTestCanvas(width = 320, height = 180) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  return { canvas, ctx, width, height };
}

/** Sample a pixel at (x, y) and return [r, g, b, a] */
export function getPixel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): [number, number, number, number] {
  const data = ctx.getImageData(x, y, 1, 1).data;
  return [data[0], data[1], data[2], data[3]];
}

/** Check if a pixel matches an expected RGB value (with tolerance) */
export function pixelMatches(
  actual: [number, number, number, number],
  expected: [number, number, number],
  tolerance = 2,
): boolean {
  return (
    Math.abs(actual[0] - expected[0]) <= tolerance &&
    Math.abs(actual[1] - expected[1]) <= tolerance &&
    Math.abs(actual[2] - expected[2]) <= tolerance
  );
}
