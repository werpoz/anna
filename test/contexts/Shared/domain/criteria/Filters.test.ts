import { describe, it, expect } from 'bun:test';
import { Filters } from '@/contexts/Shared/domain/criteria/Filters';
import { Filter } from '@/contexts/Shared/domain/criteria/Filter';
import { FilterField } from '@/contexts/Shared/domain/criteria/FilterField';
import { FilterOperator, Operator } from '@/contexts/Shared/domain/criteria/FilterOperator';
import { FilterValue } from '@/contexts/Shared/domain/criteria/FilterValue';

describe('Filters', () => {
  it('creates empty filters', () => {
    const filters = Filters.none();
    expect(filters.filters).toHaveLength(0);
  });

  it('creates from values', () => {
    const values = [
      new Map<string, string>([
        ['field', 'name'],
        ['operator', '='],
        ['value', 'Ada'],
      ]),
    ];
    const filters = Filters.fromValues(values);
    expect(filters.filters).toHaveLength(1);
  });

  it('stores filters', () => {
    const filter = new Filter(
      new FilterField('status'),
      new FilterOperator(Operator.EQUAL),
      new FilterValue('active')
    );
    const filters = new Filters([filter]);
    expect(filters.filters[0]).toBe(filter);
  });
});
