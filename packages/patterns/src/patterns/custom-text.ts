import type { TestPattern } from '../types.js';

export const customText: TestPattern = {
  id: 'custom-text',
  name: 'Custom Text',
  category: 'advanced',
  description: 'Display custom text on screen. Useful for labeling walls during multi-wall setups or showing venue/client info.',
  parameters: [
    { key: 'text', label: 'Text', type: 'select', default: 'WonderWall',
      options: [
        { label: 'WonderWall', value: 'WonderWall' },
        { label: 'TEST', value: 'TEST' },
        { label: 'WALL 1', value: 'WALL 1' },
        { label: 'WALL 2', value: 'WALL 2' },
        { label: 'DO NOT USE', value: 'DO NOT USE' },
        { label: 'STANDBY', value: 'STANDBY' },
      ],
    },
    { key: 'fontSize', label: 'Font Size', type: 'number', default: 120, min: 20, max: 500, step: 10 },
    { key: 'color', label: 'Text Color', type: 'color', default: '#ffffff' },
    { key: 'bgColor', label: 'Background', type: 'color', default: '#000000' },
    { key: 'showInfo', label: 'Show Resolution', type: 'boolean', default: true },
  ],
  render(ctx, w, h, params) {
    const text = (params.text as string) ?? 'WonderWall';
    const fontSize = (params.fontSize as number) ?? 120;
    const color = (params.color as string) ?? '#ffffff';
    const bg = (params.bgColor as string) ?? '#000000';
    const showInfo = (params.showInfo as boolean) ?? true;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Main text
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    // Resolution info
    if (showInfo) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${w} × ${h}`, w / 2, h - 16);
    }
  },
};
