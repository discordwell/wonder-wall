<script lang="ts">
  import PatternCanvas from './lib/components/PatternCanvas.svelte';
  import PatternPicker from './lib/components/PatternPicker.svelte';
  import ControlOverlay from './lib/components/ControlOverlay.svelte';
  import { patternStore } from './lib/stores/pattern.svelte.ts';

  let fullscreen = $state(false);
</script>

{#if fullscreen}
  <PatternCanvas
    pattern={patternStore.current}
    params={patternStore.params}
  />
  <ControlOverlay
    pattern={patternStore.current}
    params={patternStore.params}
    onExit={() => fullscreen = false}
    onPatternChange={(id) => patternStore.select(id)}
    onParamChange={(key, value) => patternStore.setParam(key, value)}
  />
{:else}
  <PatternPicker
    selected={patternStore.current?.id}
    onSelect={(id) => {
      patternStore.select(id);
      fullscreen = true;
    }}
  />
{/if}
