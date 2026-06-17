import type { TestPattern } from './types.js';
import { sanitizeParams } from './utils.js';

export interface RenderOptions {
  pattern: TestPattern;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  params: Record<string, unknown>;
}

export function renderPattern({ pattern, ctx, width, height, params }: RenderOptions): void {
  ctx.clearRect(0, 0, width, height);
  pattern.render(ctx, width, height, sanitizeParams(pattern, params));
}

export function createAnimationLoop(
  options: RenderOptions & { onFrame?: () => void },
): () => void {
  const { pattern, ctx, width, height, onFrame } = options;
  // Clamp once at loop start; params don't change mid-loop (PatternCanvas
  // recreates the loop when they do), so per-frame sanitizing would be wasteful.
  const params = sanitizeParams(pattern, options.params);

  if (!pattern.animate) {
    renderPattern({ pattern, ctx, width, height, params });
    return () => {};
  }

  let rafId: number;
  let running = true;

  function frame(time: number) {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    pattern.animate!(ctx, width, height, params, time);
    onFrame?.();
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
  };
}
