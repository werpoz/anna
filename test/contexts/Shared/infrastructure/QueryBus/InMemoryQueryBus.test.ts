import { describe, it, expect } from 'bun:test';
import { InMemoryQueryBus } from '@/contexts/Shared/infrastructure/QueryBus/InMemoryQueryBus';
import { Query } from '@/contexts/Shared/domain/Query';
import type { QueryHandler } from '@/contexts/Shared/domain/QueryHandler';
import type { Response } from '@/contexts/Shared/domain/Response';
import { QueryNotRegisteredError } from '@/contexts/Shared/domain/QueryNotRegisteredError';

class TestQuery extends Query {
  constructor(readonly value: string) {
    super();
  }
}

class TestResponse implements Response {
  constructor(readonly result: string) {}
}

class TestHandler implements QueryHandler<TestQuery, TestResponse> {
  public handled: TestQuery | null = null;

  subscribedTo(): Query {
    return new TestQuery('');
  }

  async handle(query: TestQuery): Promise<TestResponse> {
    this.handled = query;
    return new TestResponse(query.value.toUpperCase());
  }
}

describe('InMemoryQueryBus', () => {
  it('executes query and returns response', async () => {
    const handler = new TestHandler();
    const bus = new InMemoryQueryBus([handler]);

    const response = await bus.ask<TestResponse>(new TestQuery('hello'));
    expect(response.result).toBe('HELLO');
  });

  it('throws when no handler', async () => {
    const bus = new InMemoryQueryBus([]);
    await expect(bus.ask(new TestQuery('x'))).rejects.toThrow(QueryNotRegisteredError);
  });
});
