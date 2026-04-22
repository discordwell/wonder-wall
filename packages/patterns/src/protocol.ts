/**
 * WebSocket wire protocol shared between the WonderWall server and the phone
 * controller. Top-level discriminator is `type`; novastar action-specific
 * payloads stay loose (indexed by `action` string) because the bag of
 * brightness/test-mode/snapshot fields is wide and mostly server-internal.
 */

export type PatternParams = Record<string, unknown>;

/** Phone sends to server: "render this pattern". */
export interface SetPatternMessage {
  type: 'setPattern';
  id: string;
  params: PatternParams;
}

/** Phone sends to server: novastar hardware command. */
export interface NovastarCommand {
  type: 'novastar';
  action: string;
  [key: string]: unknown;
}

/** Server pushes to phone and HDMI output: "here is the active pattern". */
export interface PatternMessage {
  type: 'pattern';
  id: string;
  params: PatternParams;
}

export interface WireWallConfig {
  totalWidth: number;
  totalHeight: number;
  columns: number;
  rows: number;
  cabinetWidth: number;
  cabinetHeight: number;
}

/** Server pushes to all controllers on any connectivity or novastar change. */
export interface StatusMessage {
  type: 'status';
  outputClients: number;
  currentPattern: string | null;
  novastar: { connected: boolean; wall: WireWallConfig | null };
}

/** Server reply to a NovastarCommand. `error` is present iff the command failed. */
export interface NovastarResultMessage {
  type: 'novastarResult';
  action: string;
  error?: string;
  [key: string]: unknown;
}

export type ClientMessage = SetPatternMessage | NovastarCommand;
export type ServerMessage = PatternMessage | StatusMessage | NovastarResultMessage;

export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const msg = JSON.parse(raw);
    if (
      msg &&
      typeof msg === 'object' &&
      (msg.type === 'pattern' || msg.type === 'status' || msg.type === 'novastarResult')
    ) {
      return msg as ServerMessage;
    }
  } catch {
    // fall through
  }
  return null;
}

export function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const msg = JSON.parse(raw);
    if (
      msg &&
      typeof msg === 'object' &&
      (msg.type === 'setPattern' || msg.type === 'novastar')
    ) {
      return msg as ClientMessage;
    }
  } catch {
    // fall through
  }
  return null;
}
