export type { TestPattern, PatternParameter } from './types.js';
export { getPattern, getAllPatterns, getPatternsByCategory, getDefaultParams } from './registry.js';
export { renderPattern, createAnimationLoop } from './renderer.js';
export type { RenderOptions } from './renderer.js';
export { getParam } from './utils.js';
export type {
  PatternParams,
  SetPatternMessage,
  NovastarCommand,
  PatternMessage,
  StatusMessage,
  NovastarResultMessage,
  WireWallConfig,
  ClientMessage,
  ServerMessage,
} from './protocol.js';
export { parseClientMessage, parseServerMessage } from './protocol.js';
