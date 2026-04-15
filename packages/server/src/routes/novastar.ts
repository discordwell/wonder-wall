import { Hono } from 'hono';
import { captureSnapshot, getSnapshots, getSnapshot, deleteSnapshot } from '../services/config-backup.js';
import {
  connectToDevice,
  disconnectDevice,
  isConnected,
  readDeviceInfo,
  readBrightness,
  setBrightness,
  readTestMode,
  setTestMode,
  discoverDevices,
  getStatus,
  getWallConfig,
  readWallLayout,
  TestMode,
} from '../services/novastar.js';

const novastar = new Hono();

// Get connection status
novastar.get('/status', (c) => {
  return c.json({
    connected: isConnected(),
    device: getStatus(),
  });
});

// Discover devices on network
novastar.post('/discover', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const subnet = (body as any).subnet;
    const devices = await discoverDevices(subnet);
    return c.json({ devices });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Connect to a device
novastar.post('/connect', async (c) => {
  try {
    const { host } = await c.req.json();
    if (!host) return c.json({ error: 'host is required' }, 400);
    const info = await connectToDevice(host);
    const deviceInfo = await readDeviceInfo();
    // Auto-detect wall layout
    const wall = await readWallLayout();
    return c.json({ ...info, ...deviceInfo, wall });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Disconnect
novastar.post('/disconnect', (c) => {
  disconnectDevice();
  return c.json({ connected: false });
});

// Read wall layout (auto-detect or return cached)
novastar.get('/wall', async (c) => {
  try {
    const cached = getWallConfig();
    if (cached) return c.json(cached);
    const wall = await readWallLayout();
    return c.json(wall ?? { error: 'Could not detect wall layout' });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Re-detect wall layout
novastar.post('/wall/detect', async (c) => {
  try {
    const wall = await readWallLayout();
    return c.json(wall ?? { error: 'Could not detect wall layout' });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Read device info
novastar.get('/device', async (c) => {
  try {
    const info = await readDeviceInfo();
    return c.json(info);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Read brightness
novastar.get('/brightness', async (c) => {
  try {
    const brightness = await readBrightness();
    return c.json(brightness);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Set brightness
novastar.post('/brightness', async (c) => {
  try {
    const { value, channel } = await c.req.json();
    if (typeof value !== 'number') return c.json({ error: 'value is required' }, 400);
    await setBrightness(value, channel ?? 'global');
    const brightness = await readBrightness();
    return c.json(brightness);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Get test mode
novastar.get('/test-mode', async (c) => {
  try {
    const mode = await readTestMode();
    return c.json({ mode });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Set test mode
novastar.post('/test-mode', async (c) => {
  try {
    const { mode } = await c.req.json();
    if (typeof mode !== 'number') return c.json({ error: 'mode is required' }, 400);
    await setTestMode(mode as TestMode);
    return c.json({ mode });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Config backup endpoints
novastar.get('/configs', (c) => c.json({ snapshots: getSnapshots() }));

novastar.post('/configs/save', async (c) => {
  try {
    const { label } = await c.req.json().catch(() => ({ label: 'Manual save' }));
    const snapshot = await captureSnapshot(label ?? 'Manual save', false, '');
    return c.json(snapshot);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

novastar.delete('/configs/:id', (c) => {
  const deleted = deleteSnapshot(c.req.param('id'));
  return c.json({ deleted });
});

export { novastar };
