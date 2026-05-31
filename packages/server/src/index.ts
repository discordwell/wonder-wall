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
import { initPin, getPin, isValidPin } from './services/auth.js';

initPin();

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Status endpoint — read-only counts, intentionally unauthenticated for health checks
app.get('/api/status', (c) => c.json(getStatus()));

// WebSocket for phone controllers. Requires the PIN as a ?pin= query param;
// browsers can't set headers on a WS upgrade, so the PIN rides the URL.
app.get(
  '/ws/control',
  upgradeWebSocket((c) => {
    const authorized = isValidPin(c.req.query('pin'));
    return {
      onOpen(_evt, ws) {
        if (!authorized) {
          ws.close(1008, 'Invalid PIN');
          return;
        }
        addController(ws);
      },
      onMessage(evt, ws) {
        if (!authorized) return;
        handleControllerMessage(ws, typeof evt.data === 'string' ? evt.data : '');
      },
      onClose(_evt, ws) {
        if (!authorized) return;
        removeController(ws);
      },
    };
  }),
);

// WebSocket for HDMI output clients. Also PIN-gated; the /output page below is
// served with the PIN baked in, so the HDMI box needs no manual entry.
app.get(
  '/ws/output',
  upgradeWebSocket((c) => {
    const authorized = isValidPin(c.req.query('pin'));
    return {
      onOpen(_evt, ws) {
        if (!authorized) {
          ws.close(1008, 'Invalid PIN');
          return;
        }
        addOutput(ws);
      },
      onClose(_evt, ws) {
        if (!authorized) return;
        removeOutput(ws);
      },
    };
  }),
);

// Serve output page with the current PIN injected, so the HDMI display can
// open its WebSocket without anyone typing the PIN on a TV.
const outputRoot = new URL('../output', import.meta.url).pathname;
app.get('/output', async (c) => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(`${outputRoot}/index.html`, 'utf-8');
  return c.html(html.replace(/__WONDERWALL_PIN__/g, getPin()));
});

// Health check
app.get('/', (c) => c.json({ name: 'WonderWall Server', version: '0.1.0' }));

const port = parseInt(process.env.PORT ?? '3333', 10);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`WonderWall server running on http://localhost:${info.port}`);
  console.log(`  Output page: http://localhost:${info.port}/output`);
  console.log(`  Control WS:  ws://localhost:${info.port}/ws/control`);
  console.log(`  Output WS:   ws://localhost:${info.port}/ws/output`);
  console.log('');
  console.log(`  ┌─────────────────────────────┐`);
  console.log(`  │  Pairing PIN:  ${getPin()}        │`);
  console.log(`  └─────────────────────────────┘`);
  console.log(`  Enter this PIN on the phone to connect.${process.env.WONDERWALL_PIN ? '' : ' Set WONDERWALL_PIN to keep it fixed.'}`);
});

injectWebSocket(server);
