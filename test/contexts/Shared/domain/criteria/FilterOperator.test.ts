import { describe, it, expect } from 'bun:test';
import { FilterOperator, Operator } from '@/contexts/Shared/domain/criteria/FilterOperator';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

describe('FilterOperator', () => {
  it('parses operator value', () => {
    const op = FilterOperator.fromValue('=');
    expect(op.value).toBe(Operator.EQUAL);
  });

  it('detects positive operators', () => {
    expect(FilterOperator.fromValue('!=').isPositive()).toBe(false);
    expect(FilterOperator.fromValue('CONTAINS').isPositive()).toBe(true);
  });

  it('throws on invalid operator', () => {
    expect(() => FilterOperator.fromValue('INVALID')).toThrow(InvalidArgumentError);
  });

  it('throws on invalid constructor value', () => {
    expect(() => new FilterOperator('INVALID' as Operator)).toThrow(InvalidArgumentError);
  });

  it('builds equal operator', () => {
    const op = FilterOperator.equal();
    expect(op.value).toBe(Operator.EQUAL);
  });
});
