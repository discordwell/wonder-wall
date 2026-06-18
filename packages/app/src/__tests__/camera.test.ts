import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startCamera, stopCamera } from '../lib/services/camera.ts';

/** A fake MediaStream whose track records its stop() calls. */
function makeStream() {
  const track = { stop: vi.fn(), kind: 'video' };
  return {
    getTracks: () => [track],
    track,
  };
}

function makeVideo() {
  return {
    srcObject: null as unknown,
    play: vi.fn().mockResolvedValue(undefined),
  } as unknown as HTMLVideoElement & { srcObject: unknown; play: ReturnType<typeof vi.fn> };
}

function installGetUserMedia(impl: (...args: unknown[]) => Promise<unknown>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: impl },
    writable: true,
    configurable: true,
  });
}

describe('camera service', () => {
  // The module keeps a singleton stream; clear any leftover between tests.
  beforeEach(() => stopCamera());

  it('starts the rear camera and binds the stream to the video element', async () => {
    const s = makeStream();
    installGetUserMedia(vi.fn().mockResolvedValue(s));
    const video = makeVideo();

    await startCamera(video);

    expect(video.srcObject).toBe(s);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it('requests the environment-facing camera', async () => {
    const gum = vi.fn().mockResolvedValue(makeStream());
    installGetUserMedia(gum);

    await startCamera(makeVideo());

    expect(gum).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: 'environment' }),
        audio: false,
      }),
    );
  });

  it('stopCamera stops every track of the active stream', async () => {
    const s = makeStream();
    installGetUserMedia(vi.fn().mockResolvedValue(s));
    const video = makeVideo();

    await startCamera(video);
    stopCamera();

    expect(s.track.stop).toHaveBeenCalledTimes(1);
  });

  it('stopCamera is a no-op when nothing is running', () => {
    expect(() => stopCamera()).not.toThrow();
  });

  // Regression: an async teardown race. A view (CameraMapper / DiagnosticsRunner)
  // can unmount and call stopCamera() while startCamera() is still awaiting the
  // getUserMedia permission prompt. The stream that resolves afterwards must be
  // released, not installed — otherwise the camera (and its privacy light) stays
  // on after the user closed the view, with nothing left holding a reference.
  it('releases a stream that resolves after stopCamera() raced the start', async () => {
    const s = makeStream();
    let grantPermission!: (v: unknown) => void;
    installGetUserMedia(
      vi.fn(() => new Promise<unknown>((resolve) => { grantPermission = resolve; })),
    );
    const video = makeVideo();

    const starting = startCamera(video); // suspended on the permission prompt
    stopCamera();                         // view torn down before it resolved
    grantPermission(s);                   // permission granted, late
    await starting;

    expect(s.track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    expect(video.play).not.toHaveBeenCalled();
  });

  // The stream is acquired and assigned *before* `await video.play()`, so a
  // stopCamera() that lands during the play() wait must still find and release
  // it. This pins the second teardown mechanism (the synchronous `stream`
  // reference): moving the assignment after `await video.play()` would
  // reintroduce the leak while every other test still passed.
  it('releases the stream if stopCamera() lands while video.play() is awaiting', async () => {
    const s = makeStream();
    installGetUserMedia(vi.fn().mockResolvedValue(s));
    let finishPlay!: () => void;
    const video = {
      srcObject: null as unknown,
      play: vi.fn(() => new Promise<void>((resolve) => { finishPlay = resolve; })),
    } as unknown as HTMLVideoElement & { srcObject: unknown; play: ReturnType<typeof vi.fn> };

    const starting = startCamera(video);
    // Flush microtasks so getUserMedia resolves, the stream installs, and the
    // start parks on the pending play().
    await new Promise((r) => setTimeout(r, 0));
    expect(video.play).toHaveBeenCalledTimes(1); // precondition: parked on play()

    stopCamera();   // view torn down mid-play()
    finishPlay();   // play() resolves afterwards
    await starting;

    expect(s.track.stop).toHaveBeenCalledTimes(1);
  });

  // Calling startCamera twice (e.g. a re-entrant view) must release the first
  // camera handle rather than leak it behind the second.
  it('stops the previous stream when startCamera is called again', async () => {
    const a = makeStream();
    const b = makeStream();
    installGetUserMedia(
      vi.fn().mockResolvedValueOnce(a).mockResolvedValueOnce(b),
    );
    const video = makeVideo();

    await startCamera(video);
    await startCamera(video);

    expect(a.track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBe(b);
  });
});
