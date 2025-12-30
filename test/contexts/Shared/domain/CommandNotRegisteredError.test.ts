import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/CommandNotRegisteredError';

describe('@/contexts/Shared/domain/CommandNotRegisteredError', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
