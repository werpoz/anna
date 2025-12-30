import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/Response';

describe('@/contexts/Shared/domain/Response', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
