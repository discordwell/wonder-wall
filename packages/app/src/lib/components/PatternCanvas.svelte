<script lang="ts">
  import { renderPattern, createAnimationLoop, type TestPattern } from '@wonderwall/patterns';
  import { requestFullscreen, lockLandscape } from '../services/fullscreen.ts';
  import { sizeCanvasToDevicePixels } from '../services/canvas.ts';

  interface Props {
    pattern: TestPattern | null;
    params: Record<string, unknown>;
  }

  let { pattern, params }: Props = $props();

  let canvas: HTMLCanvasElement;
  let container: HTMLElement;
  let stopAnimation: (() => void) | null = null;

  function draw() {
    if (!canvas || !pattern) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size the backing store to physical device pixels and render 1:1 in that
    // space (no ctx.scale) so pixel-exact patterns map to real pixels.
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const { width, height } = sizeCanvasToDevicePixels(canvas, rect.width, rect.height, dpr);

    // Stop any running animation
    stopAnimation?.();
    stopAnimation = null;

    if (pattern.animate) {
      stopAnimation = createAnimationLoop({ pattern, ctx, width, height, params });
    } else {
      renderPattern({ pattern, ctx, width, height, params });
    }
  }

  $effect(() => {
    // Re-draw when pattern or params change
    if (pattern && canvas) {
      draw();
    }

    return () => {
      stopAnimation?.();
      stopAnimation = null;
    };
  });

  $effect(() => {
    if (container) {
      // Fullscreen needs a user gesture and is unsupported on iPhone Safari;
      // swallow the rejection so it doesn't surface as an unhandled rejection.
      // The canvas is position:fixed/inset:0, so it fills the viewport anyway.
      requestFullscreen(container).catch(() => {});
      lockLandscape();
    }

    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
</script>

<div class="canvas-container" bind:this={container}>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .canvas-container {
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 100;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
