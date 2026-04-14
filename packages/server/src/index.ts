import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import {
  addController,
  removeController,
  addOutput,
  removeOutput,
  handleControllerMessage,
  getStatus,
} from './ws.js';

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Status endpoint
app.get('/api/status', (c) => c.json(getStatus()));

// WebSocket for phone controllers
app.get(
  '/ws/control',
  upgradeWebSocket(() => ({
    onOpen(_evt, ws) {
      addController(ws);
    },
    onMessage(evt, ws) {
      handleControllerMessage(ws, typeof evt.data === 'string' ? evt.data : '');
    },
    onClose(_evt, ws) {
      removeController(ws);
    },
  })),
);

// WebSocket for HDMI output clients
app.get(
  '/ws/output',
  upgradeWebSocket(() => ({
    onOpen(_evt, ws) {
      addOutput(ws);
    },
    onClose(_evt, ws) {
      removeOutput(ws);
    },
  })),
);

// Serve output page
const outputRoot = new URL('../output', import.meta.url).pathname;
app.get('/output', async (c) => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(`${outputRoot}/index.html`, 'utf-8');
  return c.html(html);
});

// Novastar API routes
import { novastar as novastarRoutes } from './routes/novastar.js';
app.route('/api/novastar', novastarRoutes);

// Health check
app.get('/', (c) => c.json({ name: 'WonderWall Server', version: '0.1.0' }));

const port = parseInt(process.env.PORT ?? '3333', 10);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`WonderWall server running on http://localhost:${info.port}`);
  console.log(`  Output page: http://localhost:${info.port}/output`);
  console.log(`  Control WS:  ws://localhost:${info.port}/ws/control`);
  console.log(`  Output WS:   ws://localhost:${info.port}/ws/output`);
});

injectWebSocket(server);
