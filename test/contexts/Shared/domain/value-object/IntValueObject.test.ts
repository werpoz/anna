import { describe, it, expect } from 'bun:test';
import { NumberValueObject } from '@/contexts/Shared/domain/value-object/IntValueObject';

class CountValue extends NumberValueObject {}

describe('NumberValueObject', () => {
  it('stores value', () => {
    const value = new CountValue(10);
    expect(value.value).toBe(10);
  });

  it('compares values', () => {
    const a = new CountValue(5);
    const b = new CountValue(3);
    expect(a.isBiggerThan(b)).toBe(true);
  });
});
