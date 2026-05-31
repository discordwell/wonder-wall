import type { NovastarResultMessage } from '@wonderwall/patterns';
import {
  connect as wsConnect,
  disconnect as wsDisconnect,
  sendPattern,
  type ConnectionState,
} from '../services/websocket.ts';
import {
  createDefaultNovastarState,
  handleNovastarResult,
  type NovastarState,
} from '../services/novastar-client.ts';
import { patternStore } from './pattern.svelte.ts';

class ConnectionStore {
  state = $state<ConnectionState>('disconnected');
  serverUrl = $state<string>('');
  outputClients = $state(0);
  error = $state<string | null>(null);
  novastar = $state<NovastarState>(createDefaultNovastarState());

  connect(host: string, pin: string) {
    const url = `ws://${host}/ws/control?pin=${encodeURIComponent(pin)}`;
    this.serverUrl = host;
    this.error = null;

    wsConnect(url, {
      onStateChange: (s) => {
        this.state = s;
        if (s === 'connected') {
          this.error = null;
        } else if (s === 'unauthorized') {
          this.error = 'Invalid PIN — check the code shown on the server.';
          this.novastar = createDefaultNovastarState();
        } else if (s === 'disconnected') {
          this.novastar = createDefaultNovastarState();
        }
      },
      onPattern: (id, params) => {
        // Another controller (or our own echo) changed the pattern — mirror it
        // locally so multiple phones stay in sync. Does not re-send.
        patternStore.applyRemote(id, params);
      },
      onStatus: (status) => {
        this.outputClients = status.outputClients;
        this.novastar = {
          ...this.novastar,
          connected: status.novastar.connected,
          wall: status.novastar.wall ?? this.novastar.wall,
        };
      },
      onNovastarResult: (msg) => {
        this.handleNovastarMessage(msg);
      },
    });
  }

  disconnect() {
    wsDisconnect();
    this.state = 'disconnected';
    this.outputClients = 0;
    this.error = null;
    this.novastar = createDefaultNovastarState();
  }

  setPattern(id: string, params: Record<string, unknown>) {
    sendPattern(id, params);
  }

  handleNovastarMessage(msg: NovastarResultMessage) {
    this.novastar = handleNovastarResult(msg, this.novastar);
  }

  get isConnected() {
    return this.state === 'connected';
  }
}

export const connectionStore = new ConnectionStore();
