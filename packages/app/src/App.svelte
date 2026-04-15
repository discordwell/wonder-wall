<script lang="ts">
  import PatternCanvas from './lib/components/PatternCanvas.svelte';
  import PatternPicker from './lib/components/PatternPicker.svelte';
  import ControlOverlay from './lib/components/ControlOverlay.svelte';
  import CameraMapper from './lib/components/CameraMapper.svelte';
  import ModeSelector from './lib/components/ModeSelector.svelte';
  import ConnectionStatus from './lib/components/ConnectionStatus.svelte';
  import NovastarPanel from './lib/components/NovastarPanel.svelte';
  import WallConfig from './lib/components/WallConfig.svelte';
  import { patternStore } from './lib/stores/pattern.svelte.ts';
  import { connectionStore } from './lib/stores/connection.svelte.ts';
  import { wallStore } from './lib/stores/wall.svelte.ts';
  import type { PanelMap } from './lib/services/aruco.ts';

  type View = 'picker' | 'fullscreen' | 'mapper' | 'network-setup';
  let view = $state<View>('picker');

  // Sync Novastar wall detection into wallStore
  $effect(() => {
    const novaWall = connectionStore.novastar.wall;
    if (novaWall) {
      wallStore.set(novaWall.columns, novaWall.rows, true);
    }
  });

  function selectPattern(id: string) {
    patternStore.select(id);
    if (connectionStore.isConnected) {
      connectionStore.setPattern(id, patternStore.params);
    }
  }

  function changeParam(key: string, value: unknown) {
    patternStore.setParam(key, value);
    if (connectionStore.isConnected && patternStore.current) {
      connectionStore.setPattern(patternStore.current.id, patternStore.params);
    }
  }

  function startMapping() {
    patternStore.select('aruco-grid');
    patternStore.setParam('columns', wallStore.columns);
    patternStore.setParam('rows', wallStore.rows);
    if (connectionStore.isConnected) {
      connectionStore.setPattern('aruco-grid', patternStore.params);
    }
    view = 'mapper';
  }

  function onMapComplete(_map: PanelMap) {
    view = 'picker';
  }
</script>

{#if view === 'fullscreen'}
  <!-- Phone-direct mode: render pattern on this screen -->
  {#if !connectionStore.isConnected}
    <PatternCanvas
      pattern={patternStore.current}
      params={patternStore.params}
    />
  {/if}
  <ControlOverlay
    pattern={patternStore.current}
    params={patternStore.params}
    onExit={() => view = 'picker'}
    onPatternChange={selectPattern}
    onParamChange={changeParam}
    onStartMapping={startMapping}
  />

{:else if view === 'mapper'}
  {#if !connectionStore.isConnected}
    <PatternCanvas
      pattern={patternStore.current}
      params={patternStore.params}
    />
  {/if}
  <CameraMapper
    columns={wallStore.columns}
    rows={wallStore.rows}
    onComplete={onMapComplete}
    onCancel={() => view = 'fullscreen'}
  />

{:else if view === 'network-setup'}
  <div class="setup-page">
    <button class="back-btn" onclick={() => view = 'picker'}>&larr; Back</button>
    <ModeSelector onConnected={() => view = 'picker'} />
  </div>

{:else}
  <div class="picker-page">
    {#if connectionStore.isConnected}
      <ConnectionStatus onDisconnect={() => {}} />
    {/if}
    <PatternPicker
      selected={patternStore.current?.id}
      onSelect={(id) => {
        selectPattern(id);
        view = 'fullscreen';
      }}
      onStartMapping={startMapping}
      onNetworkMode={() => view = 'network-setup'}
      networkConnected={connectionStore.isConnected}
    >
      {#if connectionStore.isConnected}
        <NovastarPanel novaState={connectionStore.novastar} />
      {/if}
    </PatternPicker>
  </div>
{/if}

<style>
  .setup-page {
    width: 100%;
    height: 100%;
    background: #111;
    overflow-y: auto;
  }

  .back-btn {
    background: none;
    border: none;
    color: #4a9eff;
    font-size: 16px;
    padding: 16px 20px;
    cursor: pointer;
  }

  .picker-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
