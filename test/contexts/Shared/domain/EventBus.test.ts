import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/EventBus';

describe('@/contexts/Shared/domain/EventBus', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
