<script lang="ts">
  import type { PatternParameter } from '@wonderwall/patterns';

  interface Props {
    parameters: PatternParameter[];
    values: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
  }

  let { parameters, values, onChange }: Props = $props();
</script>

<div class="params">
  {#each parameters as param}
    <div class="param-row">
      <label class="param-label" for={param.key}>{param.label}</label>

      {#if param.type === 'color'}
        <input
          type="color"
          id={param.key}
          value={values[param.key] as string}
          oninput={(e) => onChange(param.key, e.currentTarget.value)}
        />

      {:else if param.type === 'number'}
        <div class="number-control">
          <input
            type="range"
            id={param.key}
            value={values[param.key] as number}
            min={param.min}
            max={param.max}
            step={param.step}
            oninput={(e) => onChange(param.key, Number(e.currentTarget.value))}
          />
          <span class="number-value">{values[param.key]}</span>
        </div>

      {:else if param.type === 'select'}
        <div class="select-pills">
          {#each param.options ?? [] as option}
            <button
              class="pill"
              class:active={String(values[param.key]) === String(option.value)}
              onclick={() => onChange(param.key, option.value)}
            >
              {option.label}
            </button>
          {/each}
        </div>

      {:else if param.type === 'boolean'}
        <button
          class="toggle"
          class:on={values[param.key] as boolean}
          onclick={() => onChange(param.key, !values[param.key])}
        >
          {values[param.key] ? 'ON' : 'OFF'}
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .params {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 20px;
  }

  .param-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .param-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
  }

  input[type="color"] {
    width: 44px;
    height: 34px;
    border: none;
    border-radius: 6px;
    padding: 2px;
    cursor: pointer;
    background: transparent;
  }

  .number-control {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  input[type="range"] {
    width: 100px;
    accent-color: #4a9eff;
  }

  .number-value {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    min-width: 28px;
    text-align: right;
  }

  .select-pills {
    display: flex;
    gap: 4px;
  }

  .pill {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }

  .pill.active {
    background: rgba(74, 158, 255, 0.3);
    border-color: #4a9eff;
  }

  .pill:active {
    background: rgba(255, 255, 255, 0.2);
  }

  .toggle {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 6px 16px;
    border-radius: 16px;
    font-size: 12px;
    cursor: pointer;
  }

  .toggle.on {
    background: rgba(74, 158, 255, 0.3);
    border-color: #4a9eff;
  }
</style>
