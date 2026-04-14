<script lang="ts">
  import { presetStore, type Preset } from '../stores/presets.svelte.ts';
  import { getPattern } from '@wonderwall/patterns';

  interface Props {
    currentPatternId: string | undefined;
    currentParams: Record<string, unknown>;
    onLoad: (patternId: string, params: Record<string, unknown>) => void;
  }

  let { currentPatternId, currentParams, onLoad }: Props = $props();

  let saving = $state(false);
  let saveName = $state('');

  function startSave() {
    const pattern = currentPatternId ? getPattern(currentPatternId) : null;
    saveName = pattern?.name ?? 'Preset';
    saving = true;
  }

  function confirmSave() {
    if (!currentPatternId || !saveName.trim()) return;
    presetStore.save(saveName.trim(), currentPatternId, currentParams);
    saving = false;
    saveName = '';
  }

  function loadPreset(preset: Preset) {
    onLoad(preset.patternId, preset.params);
  }

  function deletePreset(id: string) {
    presetStore.remove(id);
  }
</script>

{#if presetStore.presets.length > 0 || saving}
  <div class="preset-bar">
    <div class="preset-header">
      <span class="preset-label">Presets</span>
      {#if !saving}
        <button class="save-btn" onclick={startSave}>+ Save Current</button>
      {/if}
    </div>

    {#if saving}
      <div class="save-form">
        <input
          type="text"
          bind:value={saveName}
          placeholder="Preset name"
          onkeydown={(e) => e.key === 'Enter' && confirmSave()}
        />
        <button class="btn-sm primary" onclick={confirmSave}>Save</button>
        <button class="btn-sm" onclick={() => saving = false}>Cancel</button>
      </div>
    {/if}

    <div class="preset-list">
      {#each presetStore.presets as preset}
        <div class="preset-item">
          <button class="preset-chip" onclick={() => loadPreset(preset)}>
            {preset.name}
          </button>
          <button class="delete-btn" onclick={() => deletePreset(preset.id)}>×</button>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <button class="save-floating" onclick={startSave}>Save as Preset</button>
{/if}

<style>
  .preset-bar {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.1);
  }

  .preset-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .preset-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.4);
  }

  .save-btn, .save-floating {
    background: rgba(255,255,255,0.1);
    border: none;
    color: rgba(255,255,255,0.6);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
  }

  .save-floating {
    margin-top: 8px;
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

  .btn-sm {
    background: rgba(255,255,255,0.1);
    border: none;
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }

  .btn-sm.primary {
    background: #4a9eff;
  }

  .preset-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .preset-item {
    display: flex;
    align-items: center;
  }

  .preset-chip {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    color: white;
    padding: 4px 10px;
    border-radius: 12px 0 0 12px;
    font-size: 12px;
    cursor: pointer;
  }

  .preset-chip:active {
    background: rgba(255,255,255,0.15);
  }

  .delete-btn {
    background: rgba(255,80,80,0.2);
    border: 1px solid rgba(255,255,255,0.15);
    border-left: none;
    color: rgba(255,255,255,0.5);
    padding: 4px 6px;
    border-radius: 0 12px 12px 0;
    font-size: 12px;
    cursor: pointer;
  }
</style>
