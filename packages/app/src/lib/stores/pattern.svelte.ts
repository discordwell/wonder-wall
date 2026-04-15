import { getAllPatterns, getPattern, getDefaultParams, type TestPattern } from '@wonderwall/patterns';
import { wallStore } from './wall.svelte.ts';

// These pattern params should inherit from wall config
const WALL_PARAM_KEYS = ['columns', 'rows'];

function applyWallDefaults(params: Record<string, unknown>, pattern: TestPattern): Record<string, unknown> {
  const result = { ...params };
  for (const p of pattern.parameters) {
    if (WALL_PARAM_KEYS.includes(p.key)) {
      if (p.key === 'columns') result[p.key] = wallStore.columns;
      if (p.key === 'rows') result[p.key] = wallStore.rows;
    }
  }
  return result;
}

class PatternStore {
  current = $state<TestPattern | null>(null);
  params = $state<Record<string, unknown>>({});

  constructor() {
    const all = getAllPatterns();
    if (all.length > 0) {
      this.current = all[0];
      this.params = getDefaultParams(all[0]);
    }
  }

  select(id: string) {
    const pattern = getPattern(id);
    if (pattern) {
      this.current = pattern;
      this.params = applyWallDefaults(getDefaultParams(pattern), pattern);
    }
  }

  setParam(key: string, value: unknown) {
    this.params = { ...this.params, [key]: value };
  }

  next() {
    const all = getAllPatterns();
    if (!this.current || all.length === 0) return;
    const idx = all.findIndex((p) => p.id === this.current!.id);
    const next = all[(idx + 1) % all.length];
    this.select(next.id);
  }

  prev() {
    const all = getAllPatterns();
    if (!this.current || all.length === 0) return;
    const idx = all.findIndex((p) => p.id === this.current!.id);
    const prev = all[(idx - 1 + all.length) % all.length];
    this.select(prev.id);
  }
}

export const patternStore = new PatternStore();
