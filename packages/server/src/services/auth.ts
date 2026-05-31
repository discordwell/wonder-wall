/**
 * Shared-secret PIN guarding the control and output WebSockets. The server
 * drives real LED hardware (brightness, self-test modes, config restore), so
 * every WS connection must present the PIN — an open LAN should not be able to
 * black out or reconfigure a wall.
 *
 * Set WONDERWALL_PIN to pin it across restarts (so already-paired phones and
 * the HDMI output box stay paired); otherwise a random 6-digit PIN is
 * generated at startup and printed to the console.
 */

let pin: string | null = null;

function generatePin(): string {
  // 6 digits, no leading-zero loss (100000–999999).
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Initialize the PIN from an explicit value, then the env, then random. */
export function initPin(explicit?: string): string {
  const candidate = explicit ?? process.env.WONDERWALL_PIN;
  pin = candidate && candidate.trim() ? candidate.trim() : generatePin();
  return pin;
}

export function getPin(): string {
  if (pin === null) initPin();
  return pin as string;
}

/**
 * Whether a connection's supplied PIN matches. A LAN PIN doesn't warrant
 * constant-time comparison, so a plain compare is fine.
 */
export function isValidPin(provided: string | null | undefined): boolean {
  return typeof provided === 'string' && provided.length > 0 && provided === getPin();
}
