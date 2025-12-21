import type { QueryBus } from '@/contexts/Shared/domain/QueryBus';
import { Query } from '@/contexts/Shared/domain/Query';
import type { Response } from '@/contexts/Shared/domain/Response';
import type { QueryHandler } from '@/contexts/Shared/domain/QueryHandler';
import { QueryNotRegisteredError } from '@/contexts/Shared/domain/QueryNotRegisteredError';

export class InMemoryQueryBus implements QueryBus {
  private readonly handlers: Map<string, QueryHandler<Query, Response>>;

  constructor(handlers: Array<QueryHandler<Query, Response>> = []) {
    this.handlers = new Map();
    this.registerHandlers(handlers);
  }

  async ask<R extends Response>(query: Query): Promise<R> {
    const queryName = query.constructor.name;
    const handler = this.handlers.get(queryName);

    if (!handler) {
      throw new QueryNotRegisteredError(query);
    }

    return handler.handle(query) as Promise<R>;
  }

  private registerHandlers(handlers: Array<QueryHandler<Query, Response>>): void {
    handlers.forEach((handler) => {
      const queryName = handler.subscribedTo().constructor.name;
      this.handlers.set(queryName, handler);
    });
  }
}
