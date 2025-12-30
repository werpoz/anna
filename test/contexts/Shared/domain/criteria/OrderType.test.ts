import { describe, it, expect } from 'bun:test';
import { OrderType, OrderTypes } from '@/contexts/Shared/domain/criteria/OrderType';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

describe('OrderType', () => {
  it('parses values', () => {
    expect(OrderType.fromValue('asc').value).toBe(OrderTypes.ASC);
    expect(OrderType.fromValue('desc').value).toBe(OrderTypes.DESC);
  });

  it('detects order type', () => {
    const none = new OrderType(OrderTypes.NONE);
    expect(none.isNone()).toBe(true);
    expect(none.isAsc()).toBe(false);
  });

  it('throws on invalid value', () => {
    expect(() => OrderType.fromValue('invalid')).toThrow(InvalidArgumentError);
  });
});
