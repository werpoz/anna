import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/NewableClass';

describe('@/contexts/Shared/domain/NewableClass', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
