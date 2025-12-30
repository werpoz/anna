import { describe, it, expect } from 'bun:test';
import { FilterField } from '@/contexts/Shared/domain/criteria/FilterField';

describe('FilterField', () => {
  it('stores value', () => {
    expect(new FilterField('name').value).toBe('name');
  });
});
