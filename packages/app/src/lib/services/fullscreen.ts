export function requestFullscreen(el: HTMLElement): Promise<void> {
  if (el.requestFullscreen) {
    return el.requestFullscreen();
  }
  // Webkit fallback (older iOS Safari)
  const webkitEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  if (webkitEl.webkitRequestFullscreen) {
    return webkitEl.webkitRequestFullscreen();
  }
  return Promise.resolve();
}

export function exitFullscreen(): Promise<void> {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  }
  const webkitDoc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
  if (webkitDoc.webkitExitFullscreen) {
    return webkitDoc.webkitExitFullscreen();
  }
  return Promise.resolve();
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export function onFullscreenChange(callback: (isFs: boolean) => void): () => void {
  const handler = () => callback(isFullscreen());
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}

/** Lock screen orientation to landscape if supported */
export async function lockLandscape(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (screen.orientation as any)?.lock?.('landscape');
  } catch {
    // Orientation lock not supported — fine
  }
}
