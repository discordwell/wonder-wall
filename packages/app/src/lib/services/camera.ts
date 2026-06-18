export interface CameraFrame {
  imageData: ImageData;
  width: number;
  height: number;
}

let stream: MediaStream | null = null;
// Bumped on every stopCamera()/startCamera(). `getUserMedia` is async, so a view
// can be torn down (calling stopCamera) while a start is still awaiting the
// permission prompt. Capturing the generation lets the resolving start detect it
// lost the race and release its stream instead of leaving the camera running
// with nothing left to stop it — otherwise the camera/privacy light stays on
// after the user has closed the mapper or diagnostics view.
let generation = 0;

/** Start the rear camera and stream it into the given video element. */
export async function startCamera(video: HTMLVideoElement): Promise<void> {
  // Release any stream already running (and invalidate any in-flight start) so
  // a second call can't leak the previous camera handle.
  stopCamera();
  const myGeneration = generation;

  const acquired = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  });

  // A stopCamera() (or another startCamera()) landed while getUserMedia was
  // pending — this stream is orphaned, so stop it rather than install a camera
  // nobody will ever close.
  if (myGeneration !== generation) {
    for (const track of acquired.getTracks()) track.stop();
    return;
  }

  stream = acquired;
  video.srcObject = acquired;
  await video.play();
}

/** Stop the camera stream. Idempotent. */
export function stopCamera(): void {
  generation++;
  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    stream = null;
  }
}

/** Capture a single frame from the video element */
export function captureFrame(video: HTMLVideoElement): CameraFrame {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return {
    imageData,
    width: canvas.width,
    height: canvas.height,
  };
}
