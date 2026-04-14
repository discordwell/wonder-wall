import type { TestPattern } from './types.js';
import { solid } from './patterns/solid.js';
import { smpteBars } from './patterns/smpte-bars.js';
import { numberedGrid } from './patterns/grid.js';
import { crosshatch } from './patterns/crosshatch.js';
import { gradient } from './patterns/gradient.js';
import { arucoGrid } from './patterns/aruco-grid.js';
import { sequentialFlash } from './patterns/sequential-flash.js';
import { pixelWalk } from './patterns/pixel-walk.js';
import { colorWash } from './patterns/color-wash.js';
import { alignmentCrosses } from './patterns/alignment.js';
import { resolutionCheck } from './patterns/resolution.js';
import { brightnessSteps } from './patterns/brightness-steps.js';

const patterns: Map<string, TestPattern> = new Map();

function register(pattern: TestPattern) {
  patterns.set(pattern.id, pattern);
}

register(solid);
register(smpteBars);
register(numberedGrid);
register(crosshatch);
register(gradient);
register(arucoGrid);
register(sequentialFlash);
register(pixelWalk);
register(colorWash);
register(alignmentCrosses);
register(resolutionCheck);
register(brightnessSteps);

export function getPattern(id: string): TestPattern | undefined {
  return patterns.get(id);
}

export function getAllPatterns(): TestPattern[] {
  return Array.from(patterns.values());
}

export function getPatternsByCategory(category: TestPattern['category']): TestPattern[] {
  return getAllPatterns().filter((p) => p.category === category);
}

export function getDefaultParams(pattern: TestPattern): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const p of pattern.parameters) {
    params[p.key] = p.default;
  }
  return params;
}
