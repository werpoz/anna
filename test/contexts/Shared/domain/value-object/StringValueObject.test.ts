import { describe, it, expect } from 'bun:test';
import { StringValueObject } from '@/contexts/Shared/domain/value-object/StringValueObject';

class NameValue extends StringValueObject {}

describe('StringValueObject', () => {
  it('stores value', () => {
    const value = new NameValue('Ada');
    expect(value.value).toBe('Ada');
  });
});
