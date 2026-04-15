<script lang="ts">
  import { wallStore } from '../stores/wall.svelte.ts';

  let editing = $state(false);
  let cols = $state(wallStore.columns);
  let rows = $state(wallStore.rows);

  function save() {
    wallStore.set(
      Math.max(1, Math.min(20, cols)),
      Math.max(1, Math.min(20, rows)),
    );
    editing = false;
  }
</script>

<div class="wall-config">
  {#if editing}
    <div class="edit-row">
      <input type="number" bind:value={cols} min="1" max="20" />
      <span class="x">×</span>
      <input type="number" bind:value={rows} min="1" max="20" />
      <span class="eq">= {cols * rows} panels</span>
      <button class="btn-save" onclick={save}>Save</button>
      <button class="btn-cancel" onclick={() => editing = false}>Cancel</button>
    </div>
  {:else}
    <button class="config-display" onclick={() => { cols = wallStore.columns; rows = wallStore.rows; editing = true; }}>
      <span class="dims">{wallStore.columns} × {wallStore.rows}</span>
      <span class="label">{wallStore.totalPanels} panels{wallStore.autoDetected ? ' (auto)' : ''}</span>
      <span class="edit-hint">Edit</span>
    </button>
  {/if}
</div>

<style>
  .wall-config {
    max-width: 1200px;
    margin: 0 auto 12px;
  }

  .config-display {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 10px 16px;
    cursor: pointer;
    color: white;
    text-align: left;
  }

  .config-display:active {
    background: rgba(255, 255, 255, 0.08);
  }

  .dims {
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.4);
    flex: 1;
  }

  .edit-hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.25);
  }

  .edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(74, 158, 255, 0.3);
    border-radius: 10px;
    padding: 8px 12px;
  }

  input[type="number"] {
    width: 52px;
    background: #222;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 8px;
    color: white;
    font-size: 16px;
    text-align: center;
    outline: none;
    -moz-appearance: textfield;
  }

  input[type="number"]::-webkit-inner-spin-button { opacity: 1; }
  input[type="number"]:focus { border-color: #4a9eff; }

  .x {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.4);
  }

  .eq {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.4);
    flex: 1;
  }

  .btn-save {
    background: #4a9eff;
    border: none;
    color: white;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-cancel {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: rgba(255, 255, 255, 0.6);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }
</style>
