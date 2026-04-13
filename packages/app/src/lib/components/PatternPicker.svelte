<script lang="ts">
  import { getAllPatterns, getDefaultParams, renderPattern, type TestPattern } from '@wonderwall/patterns';
  import { onMount } from 'svelte';

  interface Props {
    selected: string | undefined;
    onSelect: (id: string) => void;
  }

  let { selected, onSelect }: Props = $props();

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
