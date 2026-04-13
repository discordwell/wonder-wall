<script lang="ts">
  import { startCamera, stopCamera, captureFrame } from '../services/camera.ts';
  import { detectMarkers, buildPanelMap, detectionCoverage, type DetectedMarker, type PanelMap } from '../services/aruco.ts';
  import { mappingStore } from '../stores/mapping.svelte.ts';

  interface Props {
    columns: number;
    rows: number;
    onComplete: (map: PanelMap) => void;
    onCancel: () => void;
  }

  let { columns, rows, onComplete, onCancel }: Props = $props();

  type Step = 'preview' | 'capturing' | 'results';

  let step = $state<Step>('preview');
  let video = $state<HTMLVideoElement>(null!);
  let cameraReady = $state(false);
  let error = $state<string | null>(null);
  let markers = $state<DetectedMarker[]>([]);
  let panelMap = $state<PanelMap | null>(null);
  let capturedImageUrl = $state<string | null>(null);

  async function initCamera() {
    try {
      await startCamera(video);
      cameraReady = true;
    } catch (e) {
      error = `Camera access denied. ${(e as Error).message}`;
    }
  }

  async function capture() {
    if (!video || !cameraReady) return;
    step = 'capturing';
    error = null;

    try {
      const frame = captureFrame(video);

      // Save captured image for display
      const canvas = document.createElement('canvas');
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(frame.imageData, 0, 0);
      capturedImageUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Detect markers
      const detected = await detectMarkers(frame);
      markers = detected;

      // Build panel map
      const map = buildPanelMap(detected, columns, rows, `Map ${new Date().toLocaleString()}`);
      panelMap = map;

      step = 'results';
    } catch (e) {
      error = `Detection failed: ${(e as Error).message}`;
      step = 'preview';
    }
  }

  async function confirmMap() {
    if (!panelMap) return;
    await mappingStore.save(panelMap);
    stopCamera();
    onComplete(panelMap);
  }

  function retry() {
    markers = [];
    panelMap = null;
    capturedImageUrl = null;
    step = 'preview';
  }

  function cancel() {
    stopCamera();
    onCancel();
  }

  $effect(() => {
    if (video) initCamera();
    return () => stopCamera();
  });

  const coverage = $derived(
    markers.length > 0 ? detectionCoverage(markers, columns, rows) : null,
  );
</script>

<div class="mapper">
  {#if step === 'preview'}
    <div class="camera-view">
      <!-- svelte-ignore element_invalid_self_closing_tag -->
      <video bind:this={video} playsinline muted />

      {#if !cameraReady && !error}
        <div class="status-overlay">Starting camera...</div>
      {/if}

      {#if error}
        <div class="status-overlay error">{error}</div>
      {/if}

      <div class="camera-guide">
        <p>Point camera at the wall showing ArUco markers</p>
        <p class="sub">Grid: {columns} x {rows} ({columns * rows} panels)</p>
      </div>

      <div class="camera-controls">
        <button class="btn secondary" onclick={cancel}>Cancel</button>
        <button class="btn primary capture-btn" onclick={capture} disabled={!cameraReady}>
          Capture
        </button>
      </div>
    </div>

  {:else if step === 'capturing'}
    <div class="status-screen">
      <div class="spinner"></div>
      <p>Detecting markers...</p>
    </div>

  {:else if step === 'results'}
    <div class="results">
      <div class="result-image">
        {#if capturedImageUrl}
          <img src={capturedImageUrl} alt="Captured wall" />
          <!-- Draw detected marker overlays -->
          <svg class="marker-overlay" viewBox="0 0 {video?.videoWidth ?? 1920} {video?.videoHeight ?? 1080}">
            {#each markers as marker}
              <polygon
                points={marker.corners.map(c => `${c.x},${c.y}`).join(' ')}
                fill="rgba(74, 158, 255, 0.3)"
                stroke="#4a9eff"
                stroke-width="3"
              />
              <text
                x={marker.center.x}
                y={marker.center.y}
                text-anchor="middle"
                dominant-baseline="central"
                fill="white"
                font-size="24"
                font-weight="bold"
                stroke="black"
                stroke-width="1"
              >#{marker.id}</text>
            {/each}
          </svg>
        {/if}
      </div>

      <div class="result-info">
        {#if coverage}
          <div class="coverage" class:good={coverage.found === coverage.total} class:partial={coverage.found > 0 && coverage.found < coverage.total} class:bad={coverage.found === 0}>
            <span class="coverage-count">{coverage.found}/{coverage.total}</span>
            <span class="coverage-label">panels detected</span>
          </div>

          {#if coverage.missing.length > 0}
            <p class="missing">Missing: {coverage.missing.map(id => `#${id}`).join(', ')}</p>
          {/if}
        {/if}

        <div class="result-actions">
          <button class="btn secondary" onclick={retry}>Retry</button>
          <button class="btn secondary" onclick={cancel}>Cancel</button>
          {#if coverage && coverage.found > 0}
            <button class="btn primary" onclick={confirmMap}>
              Save Map ({coverage.found} panels)
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .mapper {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: #000;
    display: flex;
    flex-direction: column;
  }

  .camera-view {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .status-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    font-size: 18px;
    color: white;
  }

  .status-overlay.error {
    color: #ff6b6b;
  }

  .camera-guide {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    color: white;
    background: rgba(0, 0, 0, 0.6);
    padding: 8px 20px;
    border-radius: 12px;
    font-size: 14px;
  }

  .camera-guide .sub {
    font-size: 12px;
    opacity: 0.7;
    margin-top: 2px;
  }

  .camera-controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 20px;
    padding-bottom: max(20px, env(safe-area-inset-bottom));
    background: linear-gradient(transparent, rgba(0,0,0,0.7));
  }

  .capture-btn {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
  }

  .status-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: white;
    font-size: 18px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #4a9eff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .results {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .result-image {
    flex: 1;
    position: relative;
    overflow: hidden;
    min-height: 0;
  }

  .result-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .marker-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .result-info {
    padding: 16px 20px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
  }

  .coverage {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
  }

  .coverage-count {
    font-size: 32px;
    font-weight: 700;
  }

  .coverage-label {
    font-size: 14px;
    opacity: 0.7;
  }

  .coverage.good .coverage-count { color: #4ade80; }
  .coverage.partial .coverage-count { color: #fbbf24; }
  .coverage.bad .coverage-count { color: #f87171; }

  .missing {
    font-size: 12px;
    color: #fbbf24;
    margin-bottom: 12px;
  }

  .result-actions {
    display: flex;
    gap: 10px;
  }

  .btn {
    border: none;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    color: white;
  }

  .btn.primary {
    background: #4a9eff;
    flex: 1;
  }

  .btn.primary:active {
    background: #3b8de6;
  }

  .btn.primary:disabled {
    background: #333;
    color: #666;
    cursor: default;
  }

  .btn.secondary {
    background: rgba(255, 255, 255, 0.15);
  }

  .btn.secondary:active {
    background: rgba(255, 255, 255, 0.25);
  }
</style>
