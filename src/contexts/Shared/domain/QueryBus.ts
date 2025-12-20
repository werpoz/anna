import { Query } from './Query';
import type { Response } from './Response';

export interface QueryBus {
  ask<R extends Response>(query: Query): Promise<R>;
}
