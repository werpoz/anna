import { StringValueObject } from '@/contexts/Shared/domain/value-object/StringValueObject';

export class FilterValue extends StringValueObject {
  constructor(value: string) {
    super(value);
  }
}
