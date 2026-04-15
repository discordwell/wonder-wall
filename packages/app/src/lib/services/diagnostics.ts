import type { CameraFrame } from './camera.ts';

export interface PixelAnomaly {
  x: number;
  y: number;
  type: 'dead' | 'stuck';
  channel: string; // which test pattern detected it
  deviation: number; // how far from expected (0-255)
}

export interface DiagnosticResult {
  pattern: string;
  capturedAt: string;
  anomalies: PixelAnomaly[];
  avgBrightness: number;
  uniformityScore: number; // 0-100, higher is more uniform
}

export interface DiagnosticReport {
  id: string;
  createdAt: string;
  wallColumns: number;
  wallRows: number;
  results: DiagnosticResult[];
  totalAnomalies: number;
  overallScore: number;
}

/**
 * Analyze a captured frame for dead/stuck pixels.
 * Compares each pixel region to its local neighborhood average.
 * Pixels that deviate significantly are flagged as anomalies.
 */
export function analyzeFrame(
  frame: CameraFrame,
  patternName: string,
  expectedColor: [number, number, number],
  sensitivity: number = 40,
): DiagnosticResult {
  const { imageData, width, height } = frame;
  const data = imageData.data;
  const anomalies: PixelAnomaly[] = [];

  // Sample at a grid of points (not every pixel — camera image is noisy)
  // Use a block size relative to the image resolution
  const blockSize = Math.max(4, Math.floor(Math.min(width, height) / 200));
  let totalDeviation = 0;
  let sampleCount = 0;

  for (let y = blockSize; y < height - blockSize; y += blockSize) {
    for (let x = blockSize; x < width - blockSize; x += blockSize) {
      // Average the block
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let dy = 0; dy < blockSize; dy++) {
        for (let dx = 0; dx < blockSize; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }
      const avgR = sumR / count;
      const avgG = sumG / count;
      const avgB = sumB / count;

      // Compare to local neighborhood (3x3 blocks around this one)
      let neighborR = 0, neighborG = 0, neighborB = 0, nCount = 0;
      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          if (nx === 0 && ny === 0) continue;
          const sx = x + nx * blockSize * 2;
          const sy = y + ny * blockSize * 2;
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
          const idx = (sy * width + sx) * 4;
          neighborR += data[idx];
          neighborG += data[idx + 1];
          neighborB += data[idx + 2];
          nCount++;
        }
      }
      if (nCount === 0) continue;
      neighborR /= nCount;
      neighborG /= nCount;
      neighborB /= nCount;

      // Deviation from local neighborhood
      const devR = Math.abs(avgR - neighborR);
      const devG = Math.abs(avgG - neighborG);
      const devB = Math.abs(avgB - neighborB);
      const maxDev = Math.max(devR, devG, devB);

      totalDeviation += maxDev;
      sampleCount++;

      if (maxDev > sensitivity) {
        // Determine if dead (too dark) or stuck (wrong color)
        const brightness = (avgR + avgG + avgB) / 3;
        const expectedBrightness = (expectedColor[0] + expectedColor[1] + expectedColor[2]) / 3;
        const type = brightness < expectedBrightness * 0.3 ? 'dead' : 'stuck';

        anomalies.push({
          x: Math.round(x / width * 1000) / 1000, // Normalized 0-1
          y: Math.round(y / height * 1000) / 1000,
          type,
          channel: patternName,
          deviation: Math.round(maxDev),
        });
      }
    }
  }

  const avgDeviation = sampleCount > 0 ? totalDeviation / sampleCount : 0;
  const uniformityScore = Math.round(Math.max(0, 100 - avgDeviation * 2));
  const avgBrightness = Math.round(
    Array.from({ length: Math.min(1000, width * height) }, (_, i) => {
      const idx = Math.floor(i * (width * height) / 1000) * 4;
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    }).reduce((a, b) => a + b, 0) / 1000,
  );

  return {
    pattern: patternName,
    capturedAt: new Date().toISOString(),
    anomalies,
    avgBrightness,
    uniformityScore,
  };
}

/** The test sequence for a full diagnostic run */
export const DIAGNOSTIC_STEPS = [
  { patternId: 'solid', params: { color: '#ff0000' }, name: 'Red', expected: [255, 0, 0] as [number, number, number] },
  { patternId: 'solid', params: { color: '#00ff00' }, name: 'Green', expected: [0, 255, 0] as [number, number, number] },
  { patternId: 'solid', params: { color: '#0000ff' }, name: 'Blue', expected: [0, 0, 255] as [number, number, number] },
  { patternId: 'solid', params: { color: '#ffffff' }, name: 'White', expected: [255, 255, 255] as [number, number, number] },
  { patternId: 'solid', params: { color: '#000000' }, name: 'Black', expected: [0, 0, 0] as [number, number, number] },
];

export function generateReport(
  results: DiagnosticResult[],
  wallColumns: number,
  wallRows: number,
): DiagnosticReport {
  const totalAnomalies = results.reduce((sum, r) => sum + r.anomalies.length, 0);
  const avgUniformity = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.uniformityScore, 0) / results.length)
    : 100;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    wallColumns,
    wallRows,
    results,
    totalAnomalies,
    overallScore: avgUniformity,
  };
}
