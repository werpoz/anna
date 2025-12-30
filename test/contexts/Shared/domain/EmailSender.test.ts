import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/EmailSender';

describe('@/contexts/Shared/domain/EmailSender', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
