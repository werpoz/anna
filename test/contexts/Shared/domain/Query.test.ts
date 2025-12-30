import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/Query';

describe('@/contexts/Shared/domain/Query', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
