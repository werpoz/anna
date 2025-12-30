import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/QueryNotRegisteredError';

describe('@/contexts/Shared/domain/QueryNotRegisteredError', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
