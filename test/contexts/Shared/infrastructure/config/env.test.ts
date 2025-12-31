import { describe, it, expect } from 'bun:test';
import { envHelpers } from '@/contexts/Shared/infrastructure/config/env';

describe('env', () => {
  it('parses numeric env values', () => {
    expect(envHelpers.numberOrDefault('120000', 1)).toBe(120000);
    expect(envHelpers.numberOrUndefined('9100')).toBe(9100);
  });

  it('falls back when values are missing', () => {
    expect(envHelpers.numberOrDefault(undefined, 15 * 60 * 1000)).toBe(15 * 60 * 1000);
    expect(envHelpers.numberOrUndefined(undefined)).toBeUndefined();
  });

  it('returns fallback for invalid numeric env', () => {
    expect(envHelpers.numberOrDefault('not-a-number', 15 * 60 * 1000)).toBe(15 * 60 * 1000);
    expect(envHelpers.numberOrUndefined('not-a-number')).toBeUndefined();
  });

  it('parses booleans', () => {
    expect(envHelpers.booleanOrDefault('true', false)).toBe(true);
    expect(envHelpers.booleanOrDefault('false', true)).toBe(false);
    expect(envHelpers.booleanOrDefault(undefined, true)).toBe(true);
  });
});
