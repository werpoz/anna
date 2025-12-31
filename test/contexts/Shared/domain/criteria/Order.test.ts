import { describe, it, expect } from 'bun:test';
import { Order } from '@/contexts/Shared/domain/criteria/Order';
import { OrderTypes } from '@/contexts/Shared/domain/criteria/OrderType';

describe('Order', () => {
  it('creates none when no orderBy', () => {
    const order = Order.fromValues();
    expect(order.orderType.value).toBe(OrderTypes.NONE);
    expect(order.hasOrder()).toBe(false);
  });

  it('creates asc by default', () => {
    const order = Order.fromValues('name');
    expect(order.orderType.value).toBe(OrderTypes.ASC);
    expect(order.orderBy.value).toBe('name');
    expect(order.hasOrder()).toBe(true);
  });

  it('creates desc', () => {
    const order = Order.desc('created_at');
    expect(order.orderType.value).toBe(OrderTypes.DESC);
    expect(order.hasOrder()).toBe(true);
  });

  it('creates asc explicitly', () => {
    const order = Order.asc('email');
    expect(order.orderType.value).toBe(OrderTypes.ASC);
    expect(order.orderBy.value).toBe('email');
  });
});
