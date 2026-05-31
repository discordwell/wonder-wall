const STORAGE_KEY = 'wonderwall-wall-config';

export interface WallDimensions {
  columns: number;
  rows: number;
}

function loadFromStorage(): WallDimensions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { columns: 4, rows: 3 };
}

class WallStore {
  config = $state<WallDimensions>(loadFromStorage());
  /** True when dimensions came from Novastar auto-detection */
  autoDetected = $state(false);

  set(columns: number, rows: number, auto = false) {
    this.config = { columns, rows };
    this.autoDetected = auto;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Private mode / quota exceeded — in-memory config still updates.
    }
  }

  get columns() { return this.config.columns; }
  get rows() { return this.config.rows; }
  get totalPanels() { return this.config.columns * this.config.rows; }
}

export const wallStore = new WallStore();
