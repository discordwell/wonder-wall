export interface CameraFrame {
  imageData: ImageData;
  width: number;
  height: number;
}

let stream: MediaStream | null = null;

/** Start the rear camera and return the video element */
export async function startCamera(video: HTMLVideoElement): Promise<void> {
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
}

/** Stop the camera stream */
export function stopCamera(): void {
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
