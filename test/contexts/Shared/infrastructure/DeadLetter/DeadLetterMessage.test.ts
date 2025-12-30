import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/infrastructure/DeadLetter/DeadLetterMessage';

describe('@/contexts/Shared/infrastructure/DeadLetter/DeadLetterMessage', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
