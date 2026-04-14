export interface Preset {
  id: string;
  name: string;
  patternId: string;
  params: Record<string, unknown>;
  createdAt: string;
}

const STORAGE_KEY = 'wonderwall-presets';

function loadFromStorage(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

class PresetStore {
  presets = $state<Preset[]>(loadFromStorage());

  save(name: string, patternId: string, params: Record<string, unknown>) {
    const preset: Preset = {
      id: crypto.randomUUID(),
      name,
      patternId,
      params: { ...params },
      createdAt: new Date().toISOString(),
    };
    this.presets = [...this.presets, preset];
    saveToStorage(this.presets);
    return preset;
  }

  remove(id: string) {
    this.presets = this.presets.filter((p) => p.id !== id);
    saveToStorage(this.presets);
  }

  rename(id: string, name: string) {
    this.presets = this.presets.map((p) => p.id === id ? { ...p, name } : p);
    saveToStorage(this.presets);
  }
}

export const presetStore = new PresetStore();
