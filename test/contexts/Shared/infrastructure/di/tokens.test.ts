import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/infrastructure/di/tokens';

describe('@/contexts/Shared/infrastructure/di/tokens', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
