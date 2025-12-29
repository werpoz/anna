import { Query } from '@/contexts/Shared/domain/Query';

export class FindUserQuery extends Query {
  readonly id: string;

  constructor(id: string) {
    super();
    this.id = id;
  }
}
