import { describe, it, expect } from 'bun:test';
import { FilterValue } from '@/contexts/Shared/domain/criteria/FilterValue';

describe('FilterValue', () => {
  it('stores value', () => {
    expect(new FilterValue('Ada').value).toBe('Ada');
  });
});
