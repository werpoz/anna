import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/infrastructure/di/bootstrap';

describe('@/contexts/Shared/infrastructure/di/bootstrap', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
