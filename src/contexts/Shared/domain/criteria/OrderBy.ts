import { StringValueObject } from '@/contexts/Shared/domain/value-object/StringValueObject';

export class OrderBy extends StringValueObject {
  constructor(value: string) {
    super(value);
  }
}
