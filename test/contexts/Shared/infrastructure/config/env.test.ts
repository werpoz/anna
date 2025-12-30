import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/infrastructure/config/env';

describe('@/contexts/Shared/infrastructure/config/env', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
