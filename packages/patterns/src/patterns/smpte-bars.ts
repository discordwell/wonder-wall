import type { TestPattern } from '../types.js';

// SMPTE color bar values (75% and 100% intensity)
const BARS_75 = [
  '#c0c0c0', // 75% White
  '#c0c000', // 75% Yellow
  '#00c0c0', // 75% Cyan
  '#00c000', // 75% Green
  '#c000c0', // 75% Magenta
  '#c00000', // 75% Red
  '#0000c0', // 75% Blue
];

const BARS_100 = [
  '#ffffff', // White
  '#ffff00', // Yellow
  '#00ffff', // Cyan
  '#00ff00', // Green
  '#ff00ff', // Magenta
  '#ff0000', // Red
  '#0000ff', // Blue
];

// Bottom row: PLUGE signal + sub-bars
const PLUGE_COLORS = [
  '#0000a0', // -I
  '#ffffff', // White
  '#3f0090', // +Q
  '#000000', // Black
  '#090909', // 3.5% (near-black reference)
  '#000000', // Black
  '#1a1a1a', // 7.5% (black reference)
  '#000000', // Black
];

export const smpteBars: TestPattern = {
  id: 'smpte-bars',
  name: 'SMPTE Color Bars',
  category: 'essential',
  description: 'Industry-standard SMPTE color bar pattern for monitor calibration and color reference.',
  parameters: [
    {
      key: 'intensity',
      label: 'Intensity',
      type: 'select',
      default: '75',
      options: [
        { label: '75%', value: '75' },
        { label: '100%', value: '100' },
      ],
    },
  ],
  render(ctx, w, h, params) {
    const intensity = (params.intensity as string) ?? '75';
    const bars = intensity === '100' ? BARS_100 : BARS_75;

    const topHeight = h * 0.67;
    const midHeight = h * 0.08;
    const botHeight = h - topHeight - midHeight;
    const barWidth = w / 7;

    // Top section: main color bars
    for (let i = 0; i < bars.length; i++) {
      ctx.fillStyle = bars[i];
      ctx.fillRect(Math.round(i * barWidth), 0, Math.ceil(barWidth), topHeight);
    }

    // Middle section: reverse-order subset
    const midBars = intensity === '100'
      ? ['#0000ff', '#000000', '#ff00ff', '#000000', '#00ffff', '#000000', '#ffffff']
      : ['#0000c0', '#000000', '#c000c0', '#000000', '#00c0c0', '#000000', '#c0c0c0'];
    for (let i = 0; i < midBars.length; i++) {
      ctx.fillStyle = midBars[i];
      ctx.fillRect(Math.round(i * barWidth), topHeight, Math.ceil(barWidth), midHeight);
    }

    // Bottom section: PLUGE and reference signals
    const plugeWidths = [w / 6, w / 6, w / 6, w / 6, w / 24, w / 24, w / 24, w / 24 + w / 6];
    let x = 0;
    for (let i = 0; i < PLUGE_COLORS.length; i++) {
      ctx.fillStyle = PLUGE_COLORS[i];
      const pw = plugeWidths[i];
      ctx.fillRect(Math.round(x), topHeight + midHeight, Math.ceil(pw), botHeight);
      x += pw;
    }
  },
};
