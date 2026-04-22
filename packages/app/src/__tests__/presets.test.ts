import { describe, it, expect, beforeEach, vi } from 'vitest';

async function freshStore() {
  vi.resetModules();
  return (await import('../lib/stores/presets.svelte.ts')).presetStore;
}

describe('presetStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when storage has nothing', async () => {
    const store = await freshStore();
    expect(store.presets).toEqual([]);
  });

  it('loads existing presets from storage', async () => {
    localStorage.setItem(
      'wonderwall-presets',
      JSON.stringify([{ id: '1', name: 'A', patternId: 'solid', params: {}, createdAt: '2026-01-01' }]),
    );
    const store = await freshStore();
    expect(store.presets).toHaveLength(1);
    expect(store.presets[0].name).toBe('A');
  });

  it('save() persists and returns the new preset with a generated id', async () => {
    const store = await freshStore();
    const preset = store.save('Test', 'solid', { color: '#ff0000' });
    expect(preset.id).toBeTruthy();
    expect(preset.name).toBe('Test');
    expect(store.presets).toHaveLength(1);
    const persisted = JSON.parse(localStorage.getItem('wonderwall-presets')!);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].params).toEqual({ color: '#ff0000' });
  });

  it('save() snapshots params (does not alias caller object)', async () => {
    const store = await freshStore();
    const params: Record<string, unknown> = { color: '#ff0000' };
    const preset = store.save('A', 'solid', params);
    params.color = '#00ff00'; // mutate caller's bag
    expect(preset.params).toEqual({ color: '#ff0000' });
  });

  it('remove() drops by id and persists', async () => {
    const store = await freshStore();
    const a = store.save('A', 'solid', {});
    store.save('B', 'solid', {});
    store.remove(a.id);
    expect(store.presets).toHaveLength(1);
    expect(store.presets[0].name).toBe('B');
    expect(JSON.parse(localStorage.getItem('wonderwall-presets')!)).toHaveLength(1);
  });

  it('rename() updates name and persists', async () => {
    const store = await freshStore();
    const a = store.save('Old', 'solid', {});
    store.rename(a.id, 'New');
    expect(store.presets[0].name).toBe('New');
    const persisted = JSON.parse(localStorage.getItem('wonderwall-presets')!);
    expect(persisted[0].name).toBe('New');
  });

  it('recovers from corrupt storage instead of throwing', async () => {
    localStorage.setItem('wonderwall-presets', '{not valid json');
    const store = await freshStore();
    expect(store.presets).toEqual([]);
  });
});
