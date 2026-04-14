<script lang="ts">
  import { connectionStore } from '../stores/connection.svelte.ts';

  interface Props {
    onDisconnect: () => void;
  }

  let { onDisconnect }: Props = $props();

  function disconnect() {
    connectionStore.disconnect();
    onDisconnect();
  }
</script>

<div class="status-bar">
  <div class="status-info">
    <span class="dot" class:connected={connectionStore.isConnected}></span>
    <span class="label">
      {#if connectionStore.isConnected}
        {connectionStore.serverUrl} &middot; {connectionStore.outputClients} display{connectionStore.outputClients !== 1 ? 's' : ''}
      {:else}
        Disconnected
      {/if}
    </span>
  </div>
  <button class="disconnect-btn" onclick={disconnect}>Disconnect</button>
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: rgba(74, 158, 255, 0.1);
    border-bottom: 1px solid rgba(74, 158, 255, 0.2);
  }

  .status-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;
  }

  .dot.connected {
    background: #4ade80;
  }

  .label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }

  .disconnect-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: rgba(255, 255, 255, 0.6);
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
</style>
