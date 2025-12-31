import { describe, it, expect } from 'bun:test';
import { StringValueObject } from '@/contexts/Shared/domain/value-object/StringValueObject';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

class NameValue extends StringValueObject {}

describe('StringValueObject', () => {
  it('stores value', () => {
    const value = new NameValue('Ada');
    expect(value.value).toBe('Ada');
  });

  it('inherits equality and string conversion', () => {
    const first = new NameValue('Ada');
    const second = new NameValue('Ada');

    expect(first.equals(second)).toBe(true);
    expect(first.toString()).toBe('Ada');
  });

  it('throws when value is undefined', () => {
    expect(() => new NameValue(undefined as unknown as string)).toThrow(InvalidArgumentError);
  });
});
