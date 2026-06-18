export interface Preset {
  id: string;
  name: string;
  patternId: string;
  params: Record<string, unknown>;
  createdAt: string;
}

const STORAGE_KEY = 'wonderwall-presets';

/**
 * A persisted entry is only usable if it carries the fields the store and UI
 * rely on (id/name for keying + rename/remove, patternId + params for applying).
 * Missing/extra fields would otherwise crash a render or a list operation.
 */
function isPreset(v: unknown): v is Preset {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.patternId === 'string' &&
    typeof p.params === 'object' && p.params !== null
  );
}

function loadFromStorage(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Tolerate valid-but-wrong-shape JSON (stale schema, foreign or tampered
    // localStorage): a non-array would make save/remove/rename throw on the
    // array methods below, so drop it entirely and keep only well-formed entries.
    return Array.isArray(parsed) ? parsed.filter(isPreset) : [];
  } catch {
    return [];
  }
}

function saveToStorage(presets: Preset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Private mode / quota exceeded — keep the in-memory list working; the
    // presets just won't survive a reload.
  }
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
