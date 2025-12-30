import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/QueryBus';

describe('@/contexts/Shared/domain/QueryBus', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
