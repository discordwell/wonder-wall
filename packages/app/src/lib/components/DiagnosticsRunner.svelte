<script lang="ts">
  import { startCamera, stopCamera, captureFrame } from '../services/camera.ts';
  import { analyzeFrame, generateReport, DIAGNOSTIC_STEPS, type DiagnosticResult, type DiagnosticReport } from '../services/diagnostics.ts';
  import { wallStore } from '../stores/wall.svelte.ts';
  import { connectionStore } from '../stores/connection.svelte.ts';
  import { sendPattern } from '../services/websocket.ts';

  interface Props {
    onSelectPattern: (id: string, params: Record<string, unknown>) => void;
    onClose: () => void;
  }

  let { onSelectPattern, onClose }: Props = $props();

  type Phase = 'ready' | 'running' | 'results';
  let phase = $state<Phase>('ready');
  let currentStep = $state(0);
  let results = $state<DiagnosticResult[]>([]);
  let report = $state<DiagnosticReport | null>(null);
  let video = $state<HTMLVideoElement>(null!);
  let error = $state<string | null>(null);

  const totalSteps = DIAGNOSTIC_STEPS.length;

  async function run() {
    phase = 'running';
    currentStep = 0;
    results = [];
    error = null;

    try {
      await startCamera(video);
    } catch (e) {
      error = `Camera access denied: ${(e as Error).message}`;
      phase = 'ready';
      return;
    }

    for (let i = 0; i < DIAGNOSTIC_STEPS.length; i++) {
      currentStep = i;
      const step = DIAGNOSTIC_STEPS[i];

      // Set the pattern (locally or via network)
      onSelectPattern(step.patternId, step.params);
      if (connectionStore.isConnected) {
        sendPattern(step.patternId, step.params);
      }

      // Wait for the wall to display the pattern
      await new Promise((r) => setTimeout(r, 1500));

      // Capture and analyze
      const frame = captureFrame(video);
      const result = analyzeFrame(frame, step.name, step.expected);
      results = [...results, result];
    }

    stopCamera();

    report = generateReport(results, wallStore.columns, wallStore.rows);
    phase = 'results';
  }

  function exportReport() {
    if (!report) return;
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wonderwall-diagnostic-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function scoreColor(score: number): string {
    if (score >= 90) return '#4ade80';
    if (score >= 70) return '#fbbf24';
    return '#f87171';
  }
</script>

<div class="diagnostics">
  {#if phase === 'ready'}
    <div class="intro">
      <h2>Quick Diagnostics</h2>
      <p>Automated wall health check. Displays 5 test patterns (R, G, B, White, Black), captures each with the camera, and detects dead/stuck pixels.</p>
      <p class="detail">Wall: {wallStore.columns} x {wallStore.rows} ({wallStore.totalPanels} panels)</p>
      <p class="detail">Takes about 10 seconds. Point your camera at the wall before starting.</p>
      {#if error}
        <p class="error">{error}</p>
      {/if}
      <div class="actions">
        <button class="btn secondary" onclick={onClose}>Cancel</button>
        <button class="btn primary" onclick={run}>Start Diagnostics</button>
      </div>
    </div>

  {:else if phase === 'running'}
    <div class="running">
      <!-- Hidden video for camera capture -->
      <!-- svelte-ignore element_invalid_self_closing_tag -->
      <video bind:this={video} playsinline muted style="position:absolute;opacity:0;pointer-events:none;" />

      <div class="progress-ring">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#4a9eff" stroke-width="6"
            stroke-dasharray={2 * Math.PI * 40}
            stroke-dashoffset={2 * Math.PI * 40 * (1 - (currentStep + 1) / totalSteps)}
            stroke-linecap="round"
            transform="rotate(-90 50 50)" />
        </svg>
        <span class="step-count">{currentStep + 1}/{totalSteps}</span>
      </div>
      <p class="step-name">Testing {DIAGNOSTIC_STEPS[currentStep]?.name}...</p>
      <p class="step-detail">Capturing and analyzing</p>
    </div>

  {:else if phase === 'results' && report}
    <div class="results">
      <div class="score-header">
        <div class="overall-score" style="color: {scoreColor(report.overallScore)}">
          {report.overallScore}
        </div>
        <div class="score-label">
          <span>Wall Health Score</span>
          <span class="anomaly-count">
            {report.totalAnomalies === 0 ? 'No anomalies detected' : `${report.totalAnomalies} anomal${report.totalAnomalies === 1 ? 'y' : 'ies'} detected`}
          </span>
        </div>
      </div>

      <div class="result-grid">
        {#each results as result}
          <div class="result-card">
            <div class="result-header">
              <span class="result-name">{result.pattern}</span>
              <span class="result-score" style="color: {scoreColor(result.uniformityScore)}">{result.uniformityScore}%</span>
            </div>
            <div class="result-stats">
              <span>Avg brightness: {result.avgBrightness}</span>
              {#if result.anomalies.length > 0}
                <span class="anomalies">{result.anomalies.length} issue{result.anomalies.length !== 1 ? 's' : ''}</span>
              {:else}
                <span class="clean">Clean</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="actions">
        <button class="btn secondary" onclick={onClose}>Close</button>
        <button class="btn secondary" onclick={exportReport}>Export Report</button>
        <button class="btn primary" onclick={() => { phase = 'ready'; report = null; results = []; }}>Run Again</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .diagnostics {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .intro, .running, .results {
    max-width: 480px;
    width: 100%;
    text-align: center;
  }

  h2 { font-size: 22px; font-weight: 700; margin-bottom: 12px; }
  p { color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 8px; }
  .detail { color: rgba(255,255,255,0.4); font-size: 13px; }
  .error { color: #f87171; }

  .actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 20px;
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
  .btn.primary { background: #4a9eff; }
  .btn.primary:active { background: #3b8de6; }
  .btn.secondary { background: rgba(255,255,255,0.1); }

  .running { display: flex; flex-direction: column; align-items: center; gap: 16px; }

  .progress-ring {
    width: 120px;
    height: 120px;
    position: relative;
  }
  .progress-ring svg { width: 100%; height: 100%; }
  .step-count {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
  }
  .step-name { font-size: 18px; color: white; }
  .step-detail { font-size: 13px; color: rgba(255,255,255,0.4); }

  .score-header {
    display: flex;
    align-items: center;
    gap: 16px;
    justify-content: center;
    margin-bottom: 20px;
  }
  .overall-score { font-size: 56px; font-weight: 800; }
  .score-label { text-align: left; }
  .score-label span:first-child { display: block; font-size: 14px; color: rgba(255,255,255,0.6); }
  .anomaly-count { display: block; font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; }

  .result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
    margin-bottom: 20px;
    text-align: left;
  }
  .result-card {
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
  }
  .result-name { font-size: 14px; font-weight: 600; }
  .result-score { font-size: 16px; font-weight: 700; }
  .result-stats { font-size: 11px; color: rgba(255,255,255,0.4); }
  .anomalies { color: #fbbf24; }
  .clean { color: #4ade80; }
</style>
