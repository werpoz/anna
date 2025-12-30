import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/infrastructure/DeadLetter/DeadLetterRepository';

describe('@/contexts/Shared/infrastructure/DeadLetter/DeadLetterRepository', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
