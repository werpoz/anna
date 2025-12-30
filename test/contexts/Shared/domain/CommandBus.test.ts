import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/CommandBus';

describe('@/contexts/Shared/domain/CommandBus', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
