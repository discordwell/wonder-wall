import type { WSContext } from 'hono/ws';

export interface PatternCommand {
  type: 'setPattern';
  id: string;
  params: Record<string, unknown>;
}

export interface StatusMessage {
  type: 'status';
  outputClients: number;
  currentPattern: string | null;
}

type Client = WSContext;

const controllers: Set<Client> = new Set();
const outputs: Set<Client> = new Set();

let currentPattern: { id: string; params: Record<string, unknown> } | null = null;

export function addController(ws: Client) {
  controllers.add(ws);
  // Send current state
  if (currentPattern) {
    ws.send(JSON.stringify({ type: 'pattern', ...currentPattern }));
  }
  broadcastStatus();
}

export function removeController(ws: Client) {
  controllers.delete(ws);
}

export function addOutput(ws: Client) {
  outputs.add(ws);
  // Send current pattern immediately
  if (currentPattern) {
    ws.send(JSON.stringify({ type: 'pattern', ...currentPattern }));
  }
  broadcastStatus();
}

export function removeOutput(ws: Client) {
  outputs.delete(ws);
  broadcastStatus();
}

export function handleControllerMessage(ws: Client, data: string) {
  try {
    const msg = JSON.parse(data);
    if (msg.type === 'setPattern') {
      currentPattern = { id: msg.id, params: msg.params ?? {} };
      // Relay to all output clients
      const outMsg = JSON.stringify({ type: 'pattern', id: msg.id, params: msg.params ?? {} });
      for (const output of outputs) {
        output.send(outMsg);
      }
      // Echo back to all controllers
      for (const ctrl of controllers) {
        ctrl.send(outMsg);
      }
    }
  } catch {
    // Ignore malformed messages
  }
}

function broadcastStatus() {
  const msg: StatusMessage = {
    type: 'status',
    outputClients: outputs.size,
    currentPattern: currentPattern?.id ?? null,
  };
  const data = JSON.stringify(msg);
  for (const ctrl of controllers) {
    ctrl.send(data);
  }
}

export function getStatus() {
  return {
    outputClients: outputs.size,
    controllerClients: controllers.size,
    currentPattern: currentPattern?.id ?? null,
  };
}
