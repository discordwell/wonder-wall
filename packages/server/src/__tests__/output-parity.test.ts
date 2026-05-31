import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllPatterns } from '@wonderwall/patterns';

// The /output page has inline pattern renderers to stay build-free.
// They must cover every pattern in the registry, or networked mode silently drops it.
const outputHtml = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../output/index.html'),
  'utf8',
);

describe('output page / patterns registry parity', () => {
  const registryIds = getAllPatterns().map((p) => p.id);

  it.each(registryIds)('inlines renderer for %s', (id) => {
    const patternsBlockMatch = /const patterns = \{([\s\S]*?)\n    \};/.exec(outputHtml);
    expect(patternsBlockMatch, 'patterns block not found in output/index.html').toBeTruthy();
    const block = patternsBlockMatch![1];
    const quoted = new RegExp(`['"]${id}['"]\\s*:`);
    expect(quoted.test(block), `missing inline renderer for '${id}'`).toBe(true);
  });

  it('numbered-grid renders col,row coordinate labels', () => {
    // The coord label is the defining detail of this pattern on large walls;
    // the inline version silently dropped it previously.
    expect(outputHtml).toMatch(/\$\{c\+1\},\$\{r\+1\}/);
  });

  it('renders at native device resolution without upscaling', () => {
    // The output page must size the canvas to device pixels and draw 1:1 — no
    // ctx.scale(dpr,dpr), which would turn Resolution Check's 1px checkerboard
    // into 2-3 physical pixels on a HiDPI output.
    expect(outputHtml).not.toMatch(/ctx\.scale\(/);
    expect(outputHtml).toMatch(/window\.innerWidth \* dpr/);
  });

  it('aruco-grid labels every cell and never early-exits on overflow', () => {
    // Drift guard: the inline renderer once bailed out of the grid loop past
    // the marker bank, dropping labels for overflow cells. It must instead
    // guard only the marker draw and always draw the #N label (matches the
    // @wonderwall/patterns renderer).
    expect(outputHtml).toMatch(/i < MARKER_BITS\.length/);
    expect(outputHtml).not.toMatch(/r = rows;\s*break/);
    expect(outputHtml).toMatch(/fillText\(`#\$\{i\}`/);
  });
});
