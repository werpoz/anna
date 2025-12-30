import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/CommandHandler';

describe('@/contexts/Shared/domain/CommandHandler', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
