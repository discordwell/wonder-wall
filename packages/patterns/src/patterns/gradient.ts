import type { TestPattern } from '../types.js';
import { getParam } from '../utils.js';

type ChannelValue = 'grayscale' | 'red' | 'green' | 'blue';
type DirectionValue = 'horizontal' | 'vertical';

export const gradient: TestPattern = {
  id: 'gradient',
  name: 'Gradient Ramp',
  category: 'essential',
  description: 'Smooth gradient ramp for detecting banding issues and inconsistent brightness across panels.',
  parameters: [
    {
      key: 'channel',
      label: 'Channel',
      type: 'select',
      default: 'grayscale',
      options: [
        { label: 'Grayscale', value: 'grayscale' },
        { label: 'Red', value: 'red' },
        { label: 'Green', value: 'green' },
        { label: 'Blue', value: 'blue' },
      ],
    },
    {
      key: 'direction',
      label: 'Direction',
      type: 'select',
      default: 'horizontal',
      options: [
        { label: 'Horizontal', value: 'horizontal' },
        { label: 'Vertical', value: 'vertical' },
      ],
    },
    {
      key: 'steps',
      label: 'Steps (0 = smooth)',
      type: 'number',
      default: 0,
      min: 0,
      max: 64,
      step: 1,
    },
  ],
  render(ctx, w, h, params) {
    const channel = getParam<ChannelValue>(params, 'channel', 'grayscale');
    const direction = getParam<DirectionValue>(params, 'direction', 'horizontal');
    const steps = getParam(params, 'steps', 0);

    if (steps > 0) {
      renderStepped(ctx, w, h, channel, direction, steps);
    } else {
      renderSmooth(ctx, w, h, channel, direction);
    }
  },
};

function channelColor(channel: ChannelValue, t: number): string {
  const v = Math.round(t * 255);
  switch (channel) {
    case 'red': return `rgb(${v},0,0)`;
    case 'green': return `rgb(0,${v},0)`;
    case 'blue': return `rgb(0,0,${v})`;
    default: return `rgb(${v},${v},${v})`;
  }
}

function renderSmooth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  channel: ChannelValue,
  direction: DirectionValue,
) {
  const isHorizontal = direction === 'horizontal';
  const grad = isHorizontal
    ? ctx.createLinearGradient(0, 0, w, 0)
    : ctx.createLinearGradient(0, 0, 0, h);

  // 16 stops for smooth gradient
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    grad.addColorStop(t, channelColor(channel, t));
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function renderStepped(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  channel: ChannelValue,
  direction: DirectionValue,
  steps: number,
) {
  const isHorizontal = direction === 'horizontal';
  const size = isHorizontal ? w : h;
  const stepSize = size / steps;

  for (let i = 0; i < steps; i++) {
    const t = steps <= 1 ? 0 : i / (steps - 1);
    ctx.fillStyle = channelColor(channel, t);

    if (isHorizontal) {
      const x = Math.round(i * stepSize);
      const sw = Math.round((i + 1) * stepSize) - x;
      ctx.fillRect(x, 0, sw, h);
    } else {
      const y = Math.round(i * stepSize);
      const sh = Math.round((i + 1) * stepSize) - y;
      ctx.fillRect(0, y, w, sh);
    }
  }
}
