import { getAllPatterns, getPattern, getDefaultParams, type TestPattern } from '@wonderwall/patterns';

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
      this.params = getDefaultParams(pattern);
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
