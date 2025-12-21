import { Query } from '@/contexts/Shared/domain/Query';
import type { Response } from '@/contexts/Shared/domain/Response';

export interface QueryBus {
  ask<R extends Response>(query: Query): Promise<R>;
}
