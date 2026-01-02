import { Uuid } from '@/contexts/Shared/domain/value-object/Uuid';

export class SessionId extends Uuid {
  constructor(value: string) {
    super(value);
  }
}
