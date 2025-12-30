import { describe, it, expect } from 'bun:test';
import { Filter } from '@/contexts/Shared/domain/criteria/Filter';
import { FilterField } from '@/contexts/Shared/domain/criteria/FilterField';
import { FilterOperator, Operator } from '@/contexts/Shared/domain/criteria/FilterOperator';
import { FilterValue } from '@/contexts/Shared/domain/criteria/FilterValue';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

describe('Filter', () => {
  it('builds from values map', () => {
    const values = new Map<string, string>([
      ['field', 'name'],
      ['operator', '='],
      ['value', 'Ada'],
    ]);

    const filter = Filter.fromValues(values);
    expect(filter.field.value).toBe('name');
    expect(filter.operator.value).toBe(Operator.EQUAL);
    expect(filter.value.value).toBe('Ada');
  });

  it('throws when missing values', () => {
    const values = new Map<string, string>([['field', 'name']]);
    expect(() => Filter.fromValues(values)).toThrow(InvalidArgumentError);
  });

  it('accepts explicit constructor', () => {
    const filter = new Filter(
      new FilterField('email'),
      new FilterOperator(Operator.CONTAINS),
      new FilterValue('@')
    );
    expect(filter.field.value).toBe('email');
  });
});
