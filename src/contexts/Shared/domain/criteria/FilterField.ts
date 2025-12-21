import { StringValueObject } from '@/contexts/Shared/domain/value-object/StringValueObject';

export class FilterField extends StringValueObject {
  constructor(value: string) {
    super(value);
  }
}
