import { describe, it, expect } from 'bun:test';
import { ValueObject } from '@/contexts/Shared/domain/value-object/ValueObject';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

class TextValue extends ValueObject<string> {}
class OtherTextValue extends ValueObject<string> {}

describe('ValueObject', () => {
  it('compares by type and value', () => {
    const left = new TextValue('hello');
    const right = new TextValue('hello');
    const other = new OtherTextValue('hello');

    expect(left.equals(right)).toBe(true);
    expect(left.equals(other)).toBe(false);
  });

  it('stringifies values', () => {
    const value = new TextValue('hello');
    expect(value.toString()).toBe('hello');
  });

  it('throws when value is undefined', () => {
    expect(() => new TextValue(undefined as unknown as string)).toThrow(InvalidArgumentError);
  });
});
