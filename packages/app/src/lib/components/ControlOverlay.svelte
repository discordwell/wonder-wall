<script lang="ts">
  import { getAllPatterns, type TestPattern } from '@wonderwall/patterns';
  import ParameterPanel from './ParameterPanel.svelte';

  interface Props {
    pattern: TestPattern | null;
    params: Record<string, unknown>;
    onExit: () => void;
    onPatternChange: (id: string) => void;
    onParamChange: (key: string, value: unknown) => void;
    onStartMapping?: (cols: number, rows: number) => void;
  }

  let { pattern, params, onExit, onPatternChange, onParamChange, onStartMapping }: Props = $props();

  let visible = $state(false);
  let locked = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  const allPatterns = getAllPatterns();

  // Clean up timer on component destruction
  $effect(() => {
    return () => clearHideTimer();
  });

  function show() {
    if (locked) return;
    visible = true;
    resetHideTimer();
  }

  function hide() {
    visible = false;
    clearHideTimer();
  }

  function toggle() {
    if (locked) return;
    if (visible) hide();
    else show();
  }

  function resetHideTimer() {
    clearHideTimer();
    hideTimer = setTimeout(() => {
      if (!locked) visible = false;
    }, 5000);
  }

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function handleOverlayInteraction() {
    resetHideTimer();
  }

  // Double-tap detection for screen lock
  let lastTap = 0;
  function handleTap(e: MouseEvent | TouchEvent) {
    // Don't handle taps on the overlay itself
    if ((e.target as HTMLElement).closest('.overlay-panel')) return;

    const now = Date.now();
    if (now - lastTap < 300) {
      // Double-tap: toggle lock
      locked = !locked;
      if (locked) {
        visible = false;
        clearHideTimer();
      }
      lastTap = 0;
    } else {
      lastTap = now;
      if (!locked) toggle();
    }
  }

  function prevPattern() {
    if (!pattern) return;
    const idx = allPatterns.findIndex((p) => p.id === pattern!.id);
    const prev = allPatterns[(idx - 1 + allPatterns.length) % allPatterns.length];
    onPatternChange(prev.id);
    resetHideTimer();
  }

  function nextPattern() {
    if (!pattern) return;
    const idx = allPatterns.findIndex((p) => p.id === pattern!.id);
    const next = allPatterns[(idx + 1) % allPatterns.length];
    onPatternChange(next.id);
    resetHideTimer();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay-root" onclick={handleTap}>
  {#if locked}
    <div class="lock-indicator">LOCKED (double-tap to unlock)</div>
  {/if}

  {#if visible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="overlay-panel" onclick={handleOverlayInteraction}>
      <div class="overlay-header">
        <button class="nav-btn" onclick={prevPattern}>&lt;</button>
        <span class="pattern-name">{pattern?.name ?? ''}</span>
        <button class="nav-btn" onclick={nextPattern}>&gt;</button>
        {#if onStartMapping}
          <button class="map-btn" onclick={() => onStartMapping?.(4, 3)}>Map</button>
        {/if}
        <button class="exit-btn" onclick={onExit}>Exit</button>
      </div>

      {#if pattern && pattern.parameters.length > 0}
        <ParameterPanel
          parameters={pattern.parameters}
          values={params}
          onChange={onParamChange}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  .overlay-root {
    position: fixed;
    inset: 0;
    z-index: 200;
  }

  .lock-indicator {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 0, 0, 0.6);
    color: white;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    pointer-events: none;
    animation: fadeOut 2s forwards;
    animation-delay: 1s;
  }

  @keyframes fadeOut {
    to { opacity: 0; }
  }

  .overlay-panel {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 16px 20px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    border-top: 1px solid rgba(255, 255, 255, 0.15);
  }

  .overlay-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .pattern-name {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    text-align: center;
  }

  .nav-btn {
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: white;
    width: 44px;
    height: 44px;
    border-radius: 8px;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-btn:active {
    background: rgba(255, 255, 255, 0.3);
  }

  .map-btn {
    background: rgba(74, 158, 255, 0.3);
    border: 1px solid #4a9eff;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .map-btn:active {
    background: rgba(74, 158, 255, 0.5);
  }

  .exit-btn {
    background: rgba(255, 80, 80, 0.4);
    border: none;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .exit-btn:active {
    background: rgba(255, 80, 80, 0.6);
  }
</style>
