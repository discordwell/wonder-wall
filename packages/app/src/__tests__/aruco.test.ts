import { describe, it, expect } from 'vitest';
import {
  buildPanelMap,
  observedGridPositions,
  detectionCoverage,
  type DetectedMarker,
} from '../lib/services/aruco.ts';

const CELL = 100;

/**
 * Synthesize a detected marker sitting at grid cell (col,row) in an image laid
 * out on a CELL-sized grid, optionally rotated. corners[0]=TL, [1]=TR so an
 * unrotated marker reports rotation 0.
 */
function marker(id: number, col: number, row: number, rotationDeg = 0): DetectedMarker {
  const cx = col * CELL + CELL / 2;
  const cy = row * CELL + CELL / 2;
  const s = CELL * 0.3;
  const rad = (rotationDeg * Math.PI) / 180;
  const rot = (dx: number, dy: number) => ({
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  });
  return {
    id,
    corners: [rot(-s, -s), rot(s, -s), rot(s, s), rot(-s, s)],
    center: { x: cx, y: cy },
  };
}

/** Place markers id 0..(cols*rows-1) each at their expected cell. */
function perfectGrid(cols: number, rows: number): DetectedMarker[] {
  const markers: DetectedMarker[] = [];
  for (let id = 0; id < cols * rows; id++) {
    markers.push(marker(id, id % cols, Math.floor(id / cols)));
  }
  return markers;
}

describe('ArUco spatial verification', () => {
  it('flags nothing when every panel is in its expected place', () => {
    const map = buildPanelMap(perfectGrid(3, 2), 3, 2);
    expect(map.panels).toHaveLength(6);
    expect(map.panels.some((p) => p.misplaced)).toBe(false);
    expect(map.panels.some((p) => p.rotated)).toBe(false);
  });

  it('flags both panels when two are wired in swapped positions', () => {
    const markers = perfectGrid(3, 2);
    // Swap the physical positions of marker 0 and marker 1.
    markers[0] = marker(0, 1, 0); // id 0 sitting where id 1 belongs
    markers[1] = marker(1, 0, 0); // id 1 sitting where id 0 belongs

    const map = buildPanelMap(markers, 3, 2);
    const byId = Object.fromEntries(map.panels.map((p) => [p.markerId, p]));

    expect(byId[0].misplaced).toBe(true);
    expect(byId[0].observedCol).toBe(1);
    expect(byId[0].gridCol).toBe(0);
    expect(byId[1].misplaced).toBe(true);
    expect(byId[1].observedCol).toBe(0);
    // Untouched panels stay correct.
    expect(byId[2].misplaced).toBe(false);
    expect(byId[5].misplaced).toBe(false);
  });

  it('tolerates a missing interior panel without misplacing others', () => {
    const markers = perfectGrid(3, 3).filter((m) => m.id !== 4); // drop the center
    const map = buildPanelMap(markers, 3, 3);
    expect(map.panels).toHaveLength(8);
    expect(map.panels.some((p) => p.misplaced)).toBe(false);
  });

  it('flags a panel rotated relative to the rest of the wall', () => {
    const markers = perfectGrid(3, 2);
    markers[4] = marker(4, 1, 1, 90); // physically rotated a quarter turn
    const map = buildPanelMap(markers, 3, 2);
    const byId = Object.fromEntries(map.panels.map((p) => [p.markerId, p]));

    expect(byId[4].rotated).toBe(true);
    expect(byId[4].misplaced).toBe(false); // still in the right cell
    expect(byId[0].rotated).toBe(false);
  });

  it('ignores markers whose id exceeds the panel count', () => {
    const markers = [...perfectGrid(2, 2), marker(99, 0, 0)];
    const map = buildPanelMap(markers, 2, 2);
    expect(map.panels.map((p) => p.markerId)).toEqual([0, 1, 2, 3]);
  });

  it('observedGridPositions clusters by spatial position, not id', () => {
    const positions = observedGridPositions(
      [marker(5, 2, 1), marker(0, 0, 0)],
      3,
      2,
    );
    expect(positions[0]).toEqual({ col: 2, row: 1 });
    expect(positions[1]).toEqual({ col: 0, row: 0 });
  });

  describe('detectionCoverage', () => {
    it('reports full coverage for a perfect grid', () => {
      const cov = detectionCoverage(perfectGrid(2, 2), 2, 2);
      expect(cov).toEqual({ found: 4, total: 4, missing: [] });
    });

    it('lists the ids that are missing', () => {
      const markers = perfectGrid(3, 1).filter((m) => m.id !== 1);
      const cov = detectionCoverage(markers, 3, 1);
      expect(cov.found).toBe(2);
      expect(cov.missing).toEqual([1]);
    });

    // Mirrors buildPanelMap's `id >= 0 && id < total` filter: a negative id
    // (corrupt/mocked detection) must not be counted as found, which would
    // otherwise inflate the coverage count past the real number of panels.
    it('ignores ids outside [0, total)', () => {
      const markers = [...perfectGrid(2, 2), marker(-1, 0, 0), marker(99, 0, 0)];
      const cov = detectionCoverage(markers, 2, 2);
      expect(cov.found).toBe(4);
      expect(cov.total).toBe(4);
      expect(cov.missing).toEqual([]);
    });
  });
});
