import type { CameraFrame } from './camera.ts';

export interface DetectedMarker {
  id: number;
  corners: { x: number; y: number }[];
  center: { x: number; y: number };
}

export interface PanelMapping {
  markerId: number;
  /** Where this marker's id says the panel should be (id % cols, id / cols). */
  gridCol: number;
  gridRow: number;
  /** Where the panel physically appears in the captured image. */
  observedCol: number;
  observedRow: number;
  /** Observed position differs from the id-derived expected position. */
  misplaced: boolean;
  /** Rotation deviates sharply from the rest of the wall (likely a flipped panel). */
  rotated: boolean;
  corners: { x: number; y: number }[];
  center: { x: number; y: number };
  rotation: number; // degrees
}

export interface PanelMap {
  id: string;
  name: string;
  columns: number;
  rows: number;
  panels: PanelMapping[];
  createdAt: string;
}

let detector: any = null;

async function getDetector() {
  if (detector) return detector;
  // js-aruco2 uses legacy `this.AR = AR` pattern; Vite CJS interop varies
  const mod = await import('js-aruco2/src/aruco.js');
  const AR = mod.AR ?? (mod as any).default?.AR ?? (mod as any).default;
  detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12' });
  return detector;
}

/** Detect ArUco markers in a camera frame */
export async function detectMarkers(frame: CameraFrame): Promise<DetectedMarker[]> {
  const det = await getDetector();
  const rawMarkers = det.detect(frame.imageData);

  return rawMarkers.map((m: any) => ({
    id: m.id,
    corners: m.corners.map((c: any) => ({ x: c.x, y: c.y })),
    center: {
      x: m.corners.reduce((s: number, c: any) => s + c.x, 0) / 4,
      y: m.corners.reduce((s: number, c: any) => s + c.y, 0) / 4,
    },
  }));
}

export interface GridPosition {
  col: number;
  row: number;
}

/**
 * Quantize a set of 1D positions into `count` evenly-spaced bands. Uses the
 * observed min as origin and the expected pitch ((max-min)/(count-1)), so a
 * missing interior row/column leaves a gap in the band numbering rather than
 * shifting everything after it. Assumes a roughly fronto-parallel capture that
 * includes the extreme rows/columns (the corners of the wall).
 */
function bandIndices(values: number[], count: number): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (count <= 1 || max === min) return values.map(() => 0);
  const pitch = (max - min) / (count - 1);
  return values.map((v) => Math.min(count - 1, Math.max(0, Math.round((v - min) / pitch))));
}

/**
 * Assign each detected marker an observed (col,row) from its position in the
 * captured image — independent of its marker id. Comparing this to the
 * id-derived expected position is what catches a wall wired out of order.
 */
export function observedGridPositions(
  markers: DetectedMarker[],
  columns: number,
  rows: number,
): GridPosition[] {
  const colBands = bandIndices(markers.map((m) => m.center.x), columns);
  const rowBands = bandIndices(markers.map((m) => m.center.y), rows);
  return markers.map((_, i) => ({ col: colBands[i], row: rowBands[i] }));
}

function markerRotation(marker: DetectedMarker): number {
  const dx = marker.corners[1].x - marker.corners[0].x;
  const dy = marker.corners[1].y - marker.corners[0].y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/** Smallest signed angle between two degree values, in [-180, 180]. */
function angularDelta(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// A panel whose rotation differs from the wall's median by more than this is
// flagged as rotated (camera tilt rotates every marker together, so only a
// relative outlier indicates a physically flipped panel).
const ROTATION_OUTLIER_DEGREES = 30;

/** Build a panel map from detected markers and grid configuration. */
export function buildPanelMap(
  markers: DetectedMarker[],
  columns: number,
  rows: number,
  name: string = 'Untitled',
): PanelMap {
  const totalPanels = columns * rows;
  const valid = markers.filter((m) => m.id >= 0 && m.id < totalPanels);

  const observed = observedGridPositions(valid, columns, rows);
  const rotations = valid.map(markerRotation);
  const medianRotation = median(rotations);

  const panels: PanelMapping[] = valid.map((marker, i) => {
    const gridCol = marker.id % columns;
    const gridRow = Math.floor(marker.id / columns);
    const { col: observedCol, row: observedRow } = observed[i];
    const rotation = rotations[i];

    return {
      markerId: marker.id,
      gridCol,
      gridRow,
      observedCol,
      observedRow,
      misplaced: observedCol !== gridCol || observedRow !== gridRow,
      rotated: Math.abs(angularDelta(rotation, medianRotation)) > ROTATION_OUTLIER_DEGREES,
      corners: marker.corners,
      center: marker.center,
      rotation,
    };
  });

  panels.sort((a, b) => a.markerId - b.markerId);

  return {
    id: crypto.randomUUID(),
    name,
    columns,
    rows,
    panels,
    createdAt: new Date().toISOString(),
  };
}

/** Calculate detection coverage: how many expected markers were found */
export function detectionCoverage(
  markers: DetectedMarker[],
  columns: number,
  rows: number,
): { found: number; total: number; missing: number[] } {
  const total = columns * rows;
  const foundIds = new Set(markers.filter((m) => m.id < total).map((m) => m.id));
  const missing: number[] = [];

  for (let i = 0; i < total; i++) {
    if (!foundIds.has(i)) missing.push(i);
  }

  return { found: foundIds.size, total, missing };
}
