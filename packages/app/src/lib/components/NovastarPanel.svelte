<script lang="ts">
  import { sendNovastarCommand, type NovastarState } from '../services/novastar-client.ts';

  interface Props {
    novaState: NovastarState;
  }

  let { novaState }: Props = $props();

  let connectHost = $state('');
  let connecting = $state(false);
  let error = $state<string | null>(null);
  let saveLabel = $state('');
  let showingSave = $state(false);

  const TEST_MODES = [
    { label: 'Normal', value: 0 },
    { label: 'Red', value: 2 },
    { label: 'Green', value: 3 },
    { label: 'Blue', value: 4 },
    { label: 'White', value: 5 },
    { label: 'H-Lines', value: 6 },
    { label: 'V-Lines', value: 7 },
    { label: 'Gradient', value: 9 },
  ];

  async function handleConnect() {
    if (!connectHost.trim()) return;
    connecting = true;
    error = null;
    sendNovastarCommand('connect', { host: connectHost.trim() });
    // Wait for result via WebSocket callback
    setTimeout(() => { connecting = false; }, 5000);
  }

  function handleDisconnect() {
    sendNovastarCommand('disconnect', {});
  }

  function handleBrightnessChange(channel: string, value: number) {
    sendNovastarCommand('setBrightness', { value, channel });
  }

  function handleTestMode(mode: number) {
    sendNovastarCommand('setTestMode', { mode });
  }

  function refreshBrightness() {
    sendNovastarCommand('getBrightness', {});
  }

  function refreshSnapshots() {
    sendNovastarCommand('getConfigSnapshots', {});
  }

  function saveConfig() {
    sendNovastarCommand('saveConfig', { label: saveLabel.trim() || `Save ${new Date().toLocaleTimeString()}` });
    showingSave = false;
    saveLabel = '';
  }

  function restoreConfig(id: string) {
    sendNovastarCommand('restoreConfig', { id });
  }

  $effect(() => {
    if (novaState.connected) {
      connecting = false;
      refreshBrightness();
      refreshSnapshots();
    }
  });
</script>

<div class="novastar-panel">
  <h3 class="panel-title">Novastar Controller</h3>

  {#if !novaState.connected}
    <div class="connect-section">
      <input
        type="text"
        bind:value={connectHost}
        placeholder="Controller IP (e.g. 192.168.1.100)"
        disabled={connecting}
        onkeydown={(e) => e.key === 'Enter' && handleConnect()}
      />
      <button class="btn" onclick={handleConnect} disabled={connecting || !connectHost.trim()}>
        {connecting ? '...' : 'Connect'}
      </button>
    </div>
    {#if error}
      <p class="error">{error}</p>
    {/if}

  {:else}
    <div class="connected-info">
      <span class="dot connected"></span>
      <span>Connected{novaState.modelId ? ` (Model: ${novaState.modelId})` : ''}</span>
      <button class="btn-small" onclick={handleDisconnect}>Disconnect</button>
    </div>

    {#if novaState.wall}
      <div class="wall-info">
        <span class="wall-grid">{novaState.wall.columns} x {novaState.wall.rows}</span>
        <span class="wall-detail">{novaState.wall.totalWidth}x{novaState.wall.totalHeight}px &middot; {novaState.wall.cabinetWidth}x{novaState.wall.cabinetHeight}px/panel &middot; {novaState.wall.columns * novaState.wall.rows} panels</span>
      </div>
    {/if}

    <!-- Brightness controls -->
    <div class="brightness-section">
      <h4>Brightness</h4>
      <div class="slider-row">
        <label>Global</label>
        <input type="range" min="0" max="255"
          value={novaState.brightness.global}
          oninput={(e) => handleBrightnessChange('global', Number(e.currentTarget.value))} />
        <span class="val">{novaState.brightness.global}</span>
      </div>
      <div class="slider-row">
        <label>R</label>
        <input type="range" min="0" max="255" class="red"
          value={novaState.brightness.red}
          oninput={(e) => handleBrightnessChange('red', Number(e.currentTarget.value))} />
        <span class="val">{novaState.brightness.red}</span>
      </div>
      <div class="slider-row">
        <label>G</label>
        <input type="range" min="0" max="255" class="green"
          value={novaState.brightness.green}
          oninput={(e) => handleBrightnessChange('green', Number(e.currentTarget.value))} />
        <span class="val">{novaState.brightness.green}</span>
      </div>
      <div class="slider-row">
        <label>B</label>
        <input type="range" min="0" max="255" class="blue"
          value={novaState.brightness.blue}
          oninput={(e) => handleBrightnessChange('blue', Number(e.currentTarget.value))} />
        <span class="val">{novaState.brightness.blue}</span>
      </div>
    </div>

    <!-- Built-in test modes -->
    <div class="test-section">
      <h4>Built-in Test Modes</h4>
      <div class="test-grid">
        {#each TEST_MODES as mode}
          <button class="test-btn" onclick={() => handleTestMode(mode.value)}>
            {mode.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Config backups -->
    <div class="backup-section">
      <div class="backup-header">
        <h4>Config Backups</h4>
        {#if !showingSave}
          <button class="btn-small" onclick={() => showingSave = true}>Save Current</button>
        {/if}
      </div>

      {#if showingSave}
        <div class="save-form">
          <input type="text" bind:value={saveLabel} placeholder="Label (optional)"
            onkeydown={(e) => e.key === 'Enter' && saveConfig()} />
          <button class="btn-tiny primary" onclick={saveConfig}>Save</button>
          <button class="btn-tiny" onclick={() => showingSave = false}>Cancel</button>
        </div>
      {/if}

      {#if novaState.snapshots.length > 0}
        <div class="snapshot-list">
          {#each novaState.snapshots.slice(0, 10) as snap}
            <div class="snapshot-item">
              <div class="snap-info">
                <span class="snap-label">{snap.label}</span>
                <span class="snap-time">
                  {new Date(snap.timestamp).toLocaleString()}
                  {#if snap.auto}<span class="snap-auto">auto</span>{/if}
                </span>
              </div>
              <div class="snap-values">
                B:{snap.brightness.global} R:{snap.brightness.red} G:{snap.brightness.green} B:{snap.brightness.blue}
              </div>
              <button class="restore-btn" onclick={() => restoreConfig(snap.id)}>Restore</button>
            </div>
          {/each}
        </div>
      {:else}
        <p class="no-snapshots">Changes are auto-backed up. Manual saves appear here.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .novastar-panel {
    background: rgba(255, 165, 0, 0.05);
    border: 1px solid rgba(255, 165, 0, 0.2);
    border-radius: 12px;
    padding: 16px;
    margin: 16px 0;
  }

  .panel-title {
    font-size: 15px;
    font-weight: 700;
    color: #ffa500;
    margin-bottom: 12px;
  }

  .wall-info {
    background: rgba(255,165,0,0.1);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 12px;
  }

  .wall-grid {
    font-size: 22px;
    font-weight: 700;
    color: #ffa500;
  }

  .wall-detail {
    display: block;
    font-size: 11px;
    color: rgba(255,255,255,0.4);
    margin-top: 2px;
  }

  .connect-section {
    display: flex;
    gap: 8px;
  }

  input[type="text"] {
    flex: 1;
    background: #222;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 10px 12px;
    color: white;
    font-size: 14px;
    outline: none;
  }

  input[type="text"]:focus { border-color: #ffa500; }

  .btn {
    background: #ffa500;
    border: none;
    color: #000;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .btn:disabled { opacity: 0.4; cursor: default; }

  .error { color: #f87171; font-size: 12px; margin-top: 6px; }

  .connected-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    margin-bottom: 14px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;
  }
  .dot.connected { background: #ffa500; }

  .btn-small {
    background: rgba(255,255,255,0.1);
    border: none;
    color: rgba(255,255,255,0.6);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    margin-left: auto;
  }

  .brightness-section, .test-section {
    margin-top: 12px;
  }

  h4 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.4);
    margin-bottom: 8px;
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .slider-row label {
    font-size: 12px;
    width: 44px;
    color: rgba(255,255,255,0.6);
  }

  input[type="range"] {
    flex: 1;
    accent-color: #ffa500;
    height: 4px;
  }

  input[type="range"].red { accent-color: #ff4444; }
  input[type="range"].green { accent-color: #44ff44; }
  input[type="range"].blue { accent-color: #4444ff; }

  .val {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    width: 28px;
    text-align: right;
    color: rgba(255,255,255,0.5);
  }

  .test-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .test-btn {
    background: rgba(255,165,0,0.1);
    border: 1px solid rgba(255,165,0,0.25);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }

  .test-btn:active {
    background: rgba(255,165,0,0.25);
  }

  .backup-section { margin-top: 14px; }

  .backup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .save-form {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .save-form input {
    flex: 1;
    background: #222;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 6px 10px;
    color: white;
    font-size: 13px;
    outline: none;
  }

  .btn-tiny {
    background: rgba(255,255,255,0.1);
    border: none;
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn-tiny.primary { background: #ffa500; color: #000; }

  .snapshot-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
  }

  .snapshot-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.03);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11px;
  }

  .snap-info { flex: 1; min-width: 0; }
  .snap-label {
    display: block;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .snap-time {
    display: block;
    font-size: 10px;
    color: rgba(255,255,255,0.3);
  }
  .snap-auto {
    background: rgba(255,165,0,0.2);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 9px;
    margin-left: 4px;
    color: #ffa500;
  }
  .snap-values {
    font-size: 10px;
    color: rgba(255,255,255,0.3);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .restore-btn {
    background: rgba(255,165,0,0.15);
    border: 1px solid rgba(255,165,0,0.25);
    color: #ffa500;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    cursor: pointer;
    white-space: nowrap;
  }
  .restore-btn:active { background: rgba(255,165,0,0.3); }
  .no-snapshots {
    font-size: 11px;
    color: rgba(255,255,255,0.25);
    font-style: italic;
  }
</style>
