/**
 * Size a canvas's backing store to physical device pixels and return the
 * dimensions to render in.
 *
 * Critically, callers must NOT follow this with `ctx.scale(dpr, dpr)`. Patterns
 * render 1:1 in device-pixel space so single-pixel features stay honest:
 * Resolution Check's 1px checkerboard is one physical pixel, and Crosshatch
 * hairlines are a single device pixel wide, even on a display reporting
 * devicePixelRatio > 1 (Retina / 4K with OS scaling). Assigning canvas.width /
 * height also resets any prior transform, so the context starts at identity.
 */
export interface CanvasDimensions {
  width: number;
  height: number;
}

export function sizeCanvasToDevicePixels(
  canvas: { width: number; height: number },
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): CanvasDimensions {
  const ratio = dpr > 0 ? dpr : 1;
  const width = Math.max(1, Math.round(cssWidth * ratio));
  const height = Math.max(1, Math.round(cssHeight * ratio));
  canvas.width = width;
  canvas.height = height;
  return { width, height };
}
