<script lang="ts">
  import { connectionStore } from '../stores/connection.svelte.ts';

  interface Props {
    onConnected: () => void;
  }

  let { onConnected }: Props = $props();

  let host = $state('');
  let pin = $state('');
  let connecting = $state(false);
  let error = $state<string | null>(null);

  async function handleConnect() {
    if (!host.trim() || !pin.trim()) return;
    error = null;
    connecting = true;

    // Add default port if not specified
    let target = host.trim();
    if (!target.includes(':')) target += ':3333';

    connectionStore.connect(target, pin.trim());

    // Wait up to 5 seconds for the connection to open or be rejected.
    const start = Date.now();
    while (Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 200));
      if (connectionStore.state === 'connected') {
        connecting = false;
        onConnected();
        return;
      }
      if (connectionStore.state === 'unauthorized') {
        connecting = false;
        error = connectionStore.error ?? 'Invalid PIN';
        return;
      }
    }

    connecting = false;
    connectionStore.disconnect();
    error = `Could not connect to ${target}`;
  }
</script>

<div class="mode-selector">
  <h2>Network Mode</h2>
  <p class="desc">Connect to a WonderWall server to control a remote display.</p>

  <div class="connect-form">
    <input
      type="text"
      bind:value={host}
      placeholder="Server IP (e.g. 192.168.1.50)"
      disabled={connecting}
      onkeydown={(e) => e.key === 'Enter' && handleConnect()}
    />
    <input
      class="pin-input"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      bind:value={pin}
      placeholder="PIN"
      disabled={connecting}
      onkeydown={(e) => e.key === 'Enter' && handleConnect()}
    />
    <button class="btn primary" onclick={handleConnect} disabled={connecting || !host.trim() || !pin.trim()}>
      {connecting ? 'Connecting...' : 'Connect'}
    </button>
  </div>
  <p class="pin-hint">The PIN is printed in the server's console on startup.</p>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <p class="hint">
    Run <code>npx @wonderwall/server</code> on a device connected to the wall via HDMI.
  </p>
</div>

<style>
  .mode-selector {
    padding: 24px;
    max-width: 480px;
    margin: 0 auto;
  }

  h2 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .desc {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    margin-bottom: 20px;
  }

  .connect-form {
    display: flex;
    gap: 8px;
  }

  input {
    flex: 1;
    background: #222;
    border: 1px solid #444;
    border-radius: 10px;
    padding: 12px 16px;
    color: white;
    font-size: 16px;
    outline: none;
  }

  input:focus {
    border-color: #4a9eff;
  }

  input::placeholder {
    color: #666;
  }

  .pin-input {
    flex: 0 0 84px;
    text-align: center;
    letter-spacing: 2px;
    font-variant-numeric: tabular-nums;
  }

  .pin-hint {
    color: rgba(255, 255, 255, 0.3);
    font-size: 12px;
    margin-top: 8px;
  }

  .btn {
    border: none;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    color: white;
    white-space: nowrap;
  }

  .btn.primary {
    background: #4a9eff;
  }

  .btn.primary:disabled {
    background: #333;
    color: #666;
    cursor: default;
  }

  .error {
    color: #f87171;
    font-size: 13px;
    margin-top: 8px;
  }

  .hint {
    color: rgba(255, 255, 255, 0.3);
    font-size: 12px;
    margin-top: 16px;
  }

  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }
</style>
