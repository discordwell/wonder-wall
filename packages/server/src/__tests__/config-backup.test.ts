import { describe, it, expect, beforeEach } from 'vitest';
import {
  captureSnapshot,
  getSnapshots,
  getSnapshot,
  deleteSnapshot,
} from '../services/config-backup.js';

/**
 * config-backup keeps an in-memory, newest-first ring buffer of Novastar config
 * snapshots (capped at MAX_SNAPSHOTS = 50) that backs the save/restore feature.
 * With no device connected, the underlying reads reject and are caught to
 * sentinel -1 / null values, so the capture path is fully exercisable here
 * without any hardware or mocks.
 */
const MAX_SNAPSHOTS = 50;

describe('config-backup snapshot store', () => {
  // The store is a module-level singleton; clear it before each test.
  beforeEach(() => {
    for (const id of getSnapshots().map((s) => s.id)) deleteSnapshot(id);
  });

  it('captures a snapshot with the given label, auto flag and address', async () => {
    const snap = await captureSnapshot('Manual save', false, '10.0.0.5');

    expect(snap.label).toBe('Manual save');
    expect(snap.auto).toBe(false);
    expect(snap.deviceAddress).toBe('10.0.0.5');
    expect(snap.id).toMatch(/[0-9a-f-]{36}/);
    expect(typeof snap.timestamp).toBe('string');
    // No device connected → reads fall back to the disconnected sentinels.
    expect(snap.brightness).toEqual({ global: -1, red: -1, green: -1, blue: -1 });
    expect(snap.testMode).toBe(-1);
    expect(snap.modelId).toBeNull();
  });

  it('stores snapshots newest-first', async () => {
    await captureSnapshot('first', true, 'a');
    await captureSnapshot('second', true, 'a');

    const all = getSnapshots();
    expect(all.length).toBe(2);
    expect(all[0].label).toBe('second');
    expect(all[1].label).toBe('first');
  });

  it('looks a snapshot up by id and misses cleanly', async () => {
    const snap = await captureSnapshot('findme', false, 'a');

    expect(getSnapshot(snap.id)).toBe(snap);
    expect(getSnapshot('no-such-id')).toBeUndefined();
  });

  it('deletes a snapshot by id and reports whether it existed', async () => {
    const snap = await captureSnapshot('temp', false, 'a');

    expect(deleteSnapshot(snap.id)).toBe(true);
    expect(getSnapshot(snap.id)).toBeUndefined();
    expect(getSnapshots()).toHaveLength(0);
    // Deleting again (or an unknown id) is a no-op that returns false.
    expect(deleteSnapshot(snap.id)).toBe(false);
  });

  it('caps the ring buffer at MAX_SNAPSHOTS, dropping the oldest', async () => {
    const overflow = MAX_SNAPSHOTS + 5;
    for (let i = 0; i < overflow; i++) {
      await captureSnapshot(`snap-${i}`, true, 'a');
    }

    const all = getSnapshots();
    expect(all.length).toBe(MAX_SNAPSHOTS);
    // Newest retained is the last captured; the first 5 have been evicted.
    expect(all[0].label).toBe(`snap-${overflow - 1}`);
    expect(all[all.length - 1].label).toBe(`snap-${overflow - MAX_SNAPSHOTS}`);
    expect(all.some((s) => s.label === 'snap-0')).toBe(false);
  });
});
