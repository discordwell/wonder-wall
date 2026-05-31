import { describe, it, expect, afterEach } from 'vitest';
import { initPin, getPin, isValidPin } from '../services/auth.js';

describe('auth PIN', () => {
  const original = process.env.WONDERWALL_PIN;
  afterEach(() => {
    if (original === undefined) delete process.env.WONDERWALL_PIN;
    else process.env.WONDERWALL_PIN = original;
  });

  it('uses an explicit PIN when provided', () => {
    initPin('654321');
    expect(getPin()).toBe('654321');
  });

  it('accepts the correct PIN and rejects others', () => {
    initPin('123456');
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('000000')).toBe(false);
    expect(isValidPin('')).toBe(false);
    expect(isValidPin(undefined)).toBe(false);
    expect(isValidPin(null)).toBe(false);
  });

  it('reads WONDERWALL_PIN from the environment', () => {
    process.env.WONDERWALL_PIN = '999888';
    initPin();
    expect(getPin()).toBe('999888');
    expect(isValidPin('999888')).toBe(true);
  });

  it('generates a random 6-digit PIN when nothing is configured', () => {
    delete process.env.WONDERWALL_PIN;
    const generated = initPin();
    expect(generated).toMatch(/^\d{6}$/);
  });
});
