<script lang="ts">
  import PatternCanvas from './lib/components/PatternCanvas.svelte';
  import PatternPicker from './lib/components/PatternPicker.svelte';
  import ControlOverlay from './lib/components/ControlOverlay.svelte';
  import CameraMapper from './lib/components/CameraMapper.svelte';
  import { patternStore } from './lib/stores/pattern.svelte.ts';
  import type { PanelMap } from './lib/services/aruco.ts';

  type View = 'picker' | 'fullscreen' | 'mapper';
  let view = $state<View>('picker');
  let mapColumns = $state(4);
  let mapRows = $state(3);

  function startMapping(cols: number, rows: number) {
    mapColumns = cols;
    mapRows = rows;
    // Show ArUco grid pattern first, then switch to mapper
    patternStore.select('aruco-grid');
    patternStore.setParam('columns', cols);
    patternStore.setParam('rows', rows);
    view = 'mapper';
  }

  function onMapComplete(map: PanelMap) {
    view = 'picker';
  }
</script>

{#if view === 'fullscreen'}
  <PatternCanvas
    pattern={patternStore.current}
    params={patternStore.params}
  />
  <ControlOverlay
    pattern={patternStore.current}
    params={patternStore.params}
    onExit={() => view = 'picker'}
    onPatternChange={(id) => patternStore.select(id)}
    onParamChange={(key, value) => patternStore.setParam(key, value)}
    onStartMapping={startMapping}
  />
{:else if view === 'mapper'}
  <!-- ArUco pattern stays on screen (mirrors to HDMI), camera captures over it -->
  <PatternCanvas
    pattern={patternStore.current}
    params={patternStore.params}
  />
  <CameraMapper
    columns={mapColumns}
    rows={mapRows}
    onComplete={onMapComplete}
    onCancel={() => view = 'fullscreen'}
  />
{:else}
  <PatternPicker
    selected={patternStore.current?.id}
    onSelect={(id) => {
      patternStore.select(id);
      view = 'fullscreen';
    }}
    onStartMapping={startMapping}
  />
{/if}
