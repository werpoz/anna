import { Uuid } from '@/contexts/Shared/domain/value-object/Uuid';

export class UserId extends Uuid {
  constructor(value: string) {
    super(value);
  }
}
