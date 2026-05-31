import { describe, it, expect } from 'vitest';
import { analyzeFrame, generateReport } from '../lib/services/diagnostics.ts';
import type { CameraFrame } from '../lib/services/camera.ts';

function solidFrame(w: number, h: number, r: number, g: number, b: number): CameraFrame {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return {
    imageData: { data, width: w, height: h } as unknown as ImageData,
    width: w,
    height: h,
  };
}

describe('analyzeFrame', () => {
  it('reports true average brightness for a small frame (regression: hardcoded /1000 divisor)', () => {
    // 20x20 = 400 px < 1000 samples. The old code always divided by 1000,
    // under-reporting brightness ~2.5x (would have returned ~48, not 120).
    const result = analyzeFrame(solidFrame(20, 20, 120, 120, 120), 'White', [255, 255, 255]);
    expect(result.avgBrightness).toBe(120);
  });

  it('reports true average brightness for a large frame', () => {
    const result = analyzeFrame(solidFrame(64, 64, 200, 200, 200), 'White', [255, 255, 255]);
    expect(result.avgBrightness).toBe(200);
  });

  it('finds no anomalies and high uniformity on a flat field', () => {
    const result = analyzeFrame(solidFrame(64, 64, 128, 128, 128), 'White', [255, 255, 255]);
    expect(result.anomalies).toHaveLength(0);
    expect(result.uniformityScore).toBeGreaterThanOrEqual(95);
  });
});

describe('generateReport', () => {
  it('averages per-pattern uniformity and sums anomalies', () => {
    const a = analyzeFrame(solidFrame(40, 40, 100, 100, 100), 'A', [255, 255, 255]);
    const b = analyzeFrame(solidFrame(40, 40, 150, 150, 150), 'B', [255, 255, 255]);
    const report = generateReport([a, b], 4, 3);
    expect(report.wallColumns).toBe(4);
    expect(report.results).toHaveLength(2);
    expect(report.totalAnomalies).toBe(a.anomalies.length + b.anomalies.length);
    expect(report.overallScore).toBe(Math.round((a.uniformityScore + b.uniformityScore) / 2));
  });
});
