import { describe, it, expect } from 'bun:test';
import { Uuid } from '@/contexts/Shared/domain/value-object/Uuid';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

describe('Uuid', () => {
  it('accepts valid uuid', () => {
    const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
    expect(new Uuid(id).value).toBe(id);
  });

  it('rejects invalid uuid', () => {
    expect(() => new Uuid('invalid')).toThrow(InvalidArgumentError);
  });
});
