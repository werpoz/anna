import { describe, it, expect } from 'bun:test';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';


describe('UserId', () => {
  it('accepts valid UUIDs', () => {
    const id = new UserId('11111111-1111-1111-1111-111111111111');
    expect(id.value).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('rejects invalid UUIDs', () => {
    expect(() => new UserId('not-a-uuid')).toThrow(InvalidArgumentError);
  });
});
