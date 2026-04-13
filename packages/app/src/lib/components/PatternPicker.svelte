<script lang="ts">
  import { getAllPatterns, getDefaultParams, renderPattern, type TestPattern } from '@wonderwall/patterns';
  import { onMount } from 'svelte';

  interface Props {
    selected: string | undefined;
    onSelect: (id: string) => void;
    onStartMapping?: (cols: number, rows: number) => void;
  }

  let { selected, onSelect, onStartMapping }: Props = $props();

  const patterns = getAllPatterns();
  let thumbnails: Map<string, string> = $state(new Map());

  onMount(() => {
    // Render thumbnails for each pattern
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d')!;

    const thumbs = new Map<string, string>();
    for (const p of patterns) {
      const params = getDefaultParams(p);
      renderPattern({ pattern: p, ctx, width: 320, height: 180, params });
      thumbs.set(p.id, canvas.toDataURL('image/png'));
      ctx.clearRect(0, 0, 320, 180);
    }
    thumbnails = thumbs;
  });
</script>

<div class="picker">
  <header class="picker-header">
    <h1 class="title">WonderWall</h1>
    <p class="subtitle">Tap a pattern to display fullscreen</p>
  </header>

  {#if onStartMapping}
    <div class="map-section">
      <button class="map-card" onclick={() => onStartMapping?.(4, 3)}>
        <div class="map-icon">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="12" rx="2" />
            <rect x="28" y="4" width="16" height="12" rx="2" />
            <rect x="4" y="22" width="16" height="12" rx="2" />
            <rect x="28" y="22" width="16" height="12" rx="2" />
            <circle cx="24" cy="40" r="5" />
            <line x1="24" y1="35" x2="24" y2="28" />
          </svg>
        </div>
        <div class="map-card-info">
          <span class="map-card-title">Map Panels</span>
          <span class="map-card-desc">Camera-assisted panel identification</span>
        </div>
      </button>
    </div>
  {/if}

  <div class="grid">
    {#each patterns as pattern}
      <button
        class="card"
        class:selected={selected === pattern.id}
        onclick={() => onSelect(pattern.id)}
      >
        <div class="thumbnail">
          {#if thumbnails.get(pattern.id)}
            <img src={thumbnails.get(pattern.id)} alt={pattern.name} />
          {/if}
        </div>
        <div class="card-info">
          <span class="card-name">{pattern.name}</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .picker {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 20px;
    padding-top: max(20px, env(safe-area-inset-top));
    background: #111;
  }

  .picker-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .map-section {
    max-width: 1200px;
    margin: 0 auto 16px;
  }

  .map-card {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(74, 158, 255, 0.1);
    border: 1px solid rgba(74, 158, 255, 0.3);
    border-radius: 12px;
    padding: 16px 20px;
    cursor: pointer;
    color: white;
    text-align: left;
    transition: background 0.15s;
  }

  .map-card:active {
    background: rgba(74, 158, 255, 0.2);
  }

  .map-icon {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    color: #4a9eff;
  }

  .map-card-title {
    display: block;
    font-size: 16px;
    font-weight: 600;
  }

  .map-card-desc {
    display: block;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
  }

  .title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 4px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .card {
    background: #1a1a1a;
    border: 2px solid transparent;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.1s;
    padding: 0;
    text-align: left;
    color: white;
  }

  .card:active {
    transform: scale(0.97);
  }

  .card.selected {
    border-color: #4a9eff;
  }

  .thumbnail {
    aspect-ratio: 16 / 9;
    background: #000;
    overflow: hidden;
  }

  .thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-info {
    padding: 10px 12px;
  }

  .card-name {
    font-size: 14px;
    font-weight: 600;
  }
</style>
