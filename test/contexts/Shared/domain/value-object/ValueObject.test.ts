import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/value-object/ValueObject';

describe('@/contexts/Shared/domain/value-object/ValueObject', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
