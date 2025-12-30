import { describe, it, expect } from 'bun:test';
import { OrderBy } from '@/contexts/Shared/domain/criteria/OrderBy';

describe('OrderBy', () => {
  it('stores value', () => {
    expect(new OrderBy('created_at').value).toBe('created_at');
  });
});
