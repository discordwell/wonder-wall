import {
  connect as wsConnect,
  disconnect as wsDisconnect,
  sendPattern,
  type ConnectionState,
  type WsCallbacks,
} from '../services/websocket.ts';
import {
  createDefaultNovastarState,
  handleNovastarResult,
  type NovastarState,
} from '../services/novastar-client.ts';

class ConnectionStore {
  state = $state<ConnectionState>('disconnected');
  serverUrl = $state<string>('');
  outputClients = $state(0);
  novastar = $state<NovastarState>(createDefaultNovastarState());

  connect(host: string) {
    const url = `ws://${host}/ws/control`;
    this.serverUrl = host;

    wsConnect(url, {
      onStateChange: (s) => {
        this.state = s;
        if (s === 'disconnected') {
          this.novastar = createDefaultNovastarState();
        }
      },
      onPattern: () => {
        // Pattern echo from server — we already have it locally
      },
      onStatus: (outputs, extra) => {
        this.outputClients = outputs;
        if (extra?.novastar) {
          this.novastar = { ...this.novastar, connected: extra.novastar.connected };
        }
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
    this.novastar = createDefaultNovastarState();
  }

  setPattern(id: string, params: Record<string, unknown>) {
    sendPattern(id, params);
  }

  handleNovastarMessage(msg: any) {
    this.novastar = handleNovastarResult(msg, this.novastar);
  }

  get isConnected() {
    return this.state === 'connected';
  }
}

export const connectionStore = new ConnectionStore();
