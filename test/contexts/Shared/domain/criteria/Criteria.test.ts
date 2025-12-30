import { describe, it, expect } from 'bun:test';
import { Criteria } from '@/contexts/Shared/domain/criteria/Criteria';
import { Filters } from '@/contexts/Shared/domain/criteria/Filters';
import { Order } from '@/contexts/Shared/domain/criteria/Order';

describe('Criteria', () => {
  it('detects filters', () => {
    const criteria = new Criteria(Filters.none(), Order.none());
    expect(criteria.hasFilters()).toBe(false);
  });

  it('detects filters when present', () => {
    const criteria = new Criteria(Filters.fromValues([
      new Map<string, string>([
        ['field', 'name'],
        ['operator', '='],
        ['value', 'Ada'],
      ]),
    ]), Order.none());
    expect(criteria.hasFilters()).toBe(true);
  });
});
