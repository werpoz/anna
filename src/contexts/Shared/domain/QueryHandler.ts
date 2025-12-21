import { Query } from '@/contexts/Shared/domain/Query';
import type{ Response } from '@/contexts/Shared/domain/Response';

export interface QueryHandler<Q extends Query, R extends Response> {
  subscribedTo(): Query;
  handle(query: Q): Promise<R>;
}
