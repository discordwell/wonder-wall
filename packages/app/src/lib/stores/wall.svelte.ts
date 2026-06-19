const STORAGE_KEY = 'wonderwall-wall-config';

// A real LED wall is at most a few dozen cabinets per axis; this cap only
// exists to keep an absurd/overflowing auto-detected value (or a hostile
// relayed one) from producing a NaN-ish `totalPanels` or a nonsense display.
const MAX_DIMENSION = 1000;

export interface WallDimensions {
  columns: number;
  rows: number;
}

/**
 * Coerce one dimension to a usable count: a positive integer in
 * [1, MAX_DIMENSION]. A non-finite / non-number value (the shape that reaches
 * `set` from the unvalidated Novastar wall config relayed over the status and
 * novastarResult messages — see App.svelte) keeps the current value instead of
 * poisoning the store with NaN/garbage.
 */
function clampDimension(value: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_DIMENSION, Math.max(1, Math.round(value)));
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
    // Validate at the single write boundary — the same invariant the load path
    // enforces via isValidDimensions — so a malformed call can't corrupt the
    // live config, the camera-mapper grid, or what gets persisted. The Novastar
    // auto-detect path (App.svelte) feeds this straight from server-relayed
    // wall fields that parseServerMessage does not shape-check.
    this.config = {
      columns: clampDimension(columns, this.config.columns),
      rows: clampDimension(rows, this.config.rows),
    };
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
