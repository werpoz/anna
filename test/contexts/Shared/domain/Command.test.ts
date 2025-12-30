import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/Command';

describe('@/contexts/Shared/domain/Command', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
