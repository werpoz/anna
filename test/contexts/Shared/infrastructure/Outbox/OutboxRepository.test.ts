import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/infrastructure/Outbox/OutboxRepository';

describe('@/contexts/Shared/infrastructure/Outbox/OutboxRepository', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
