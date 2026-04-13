<script lang="ts">
  import { renderPattern, createAnimationLoop, type TestPattern } from '@wonderwall/patterns';
  import { requestFullscreen, lockLandscape } from '../services/fullscreen.ts';

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

    // Match canvas to display size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Stop any running animation
    stopAnimation?.();
    stopAnimation = null;

    if (pattern.animate) {
      stopAnimation = createAnimationLoop({
        pattern,
        ctx,
        width: rect.width,
        height: rect.height,
        params,
      });
    } else {
      renderPattern({
        pattern,
        ctx,
        width: rect.width,
        height: rect.height,
        params,
      });
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
      requestFullscreen(container);
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
