import type { CameraFrame } from './camera.ts';

export interface DetectedMarker {
  id: number;
  corners: { x: number; y: number }[];
  center: { x: number; y: number };
}

export interface PanelMapping {
  markerId: number;
  gridCol: number;
  gridRow: number;
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
  // js-aruco2 uses CJS exports; dynamic import via Vite
  const { AR } = await import('js-aruco2/src/aruco.js');
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

/** Build a panel map from detected markers and grid configuration */
export function buildPanelMap(
  markers: DetectedMarker[],
  columns: number,
  rows: number,
  name: string = 'Untitled',
): PanelMap {
  const totalPanels = columns * rows;
  const panels: PanelMapping[] = [];

  for (const marker of markers) {
    if (marker.id >= totalPanels) continue;

    const gridCol = marker.id % columns;
    const gridRow = Math.floor(marker.id / columns);

    // Calculate rotation from corners
    const dx = marker.corners[1].x - marker.corners[0].x;
    const dy = marker.corners[1].y - marker.corners[0].y;
    const rotation = Math.atan2(dy, dx) * (180 / Math.PI);

    panels.push({
      markerId: marker.id,
      gridCol,
      gridRow,
      corners: marker.corners,
      center: marker.center,
      rotation,
    });
  }

  // Sort by grid position
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
