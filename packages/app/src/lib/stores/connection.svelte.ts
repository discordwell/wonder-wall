import {
  connect as wsConnect,
  disconnect as wsDisconnect,
  sendPattern,
  type ConnectionState,
} from '../services/websocket.ts';

class ConnectionStore {
  state = $state<ConnectionState>('disconnected');
  serverUrl = $state<string>('');
  outputClients = $state(0);

  connect(host: string) {
    const url = `ws://${host}/ws/control`;
    this.serverUrl = host;

    wsConnect(url, {
      onStateChange: (s) => {
        this.state = s;
      },
      onPattern: () => {
        // Pattern echo from server — we already have it locally
      },
      onStatus: (outputs) => {
        this.outputClients = outputs;
      },
    });
  }

  disconnect() {
    wsDisconnect();
    this.state = 'disconnected';
    this.outputClients = 0;
  }

  setPattern(id: string, params: Record<string, unknown>) {
    sendPattern(id, params);
  }

  get isConnected() {
    return this.state === 'connected';
  }
}

export const connectionStore = new ConnectionStore();
