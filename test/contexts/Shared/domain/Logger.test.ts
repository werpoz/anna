import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/Logger';

describe('@/contexts/Shared/domain/Logger', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
