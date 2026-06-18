const STORAGE_KEY = 'wonderwall-wall-config';

export interface WallDimensions {
  columns: number;
  rows: number;
}

/**
 * A stored value is only usable if it's an object with finite, positive
 * column/row counts. Valid-but-wrong-shape JSON (e.g. `null`, `{}`, an array,
 * or a stale schema) parses fine yet would make `config.columns` throw or
 * `totalPanels` evaluate to NaN — so the shape is validated here, not just the
 * JSON.parse. Legitimate persisted values (positive integers) always pass.
 */
function isValidDimensions(v: unknown): v is WallDimensions {
  if (typeof v !== 'object' || v === null) return false;
  const { columns, rows } = v as Record<string, unknown>;
  return (
    typeof columns === 'number' && Number.isFinite(columns) && columns >= 1 &&
    typeof rows === 'number' && Number.isFinite(rows) && rows >= 1
  );
}

function loadFromStorage(): WallDimensions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidDimensions(parsed)) return { columns: parsed.columns, rows: parsed.rows };
    }
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
