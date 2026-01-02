import { Uuid } from '@/contexts/Shared/domain/value-object/Uuid';

export class SessionTenantId extends Uuid {
  constructor(value: string) {
    super(value);
  }
}
