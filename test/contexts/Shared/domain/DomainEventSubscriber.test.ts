import { describe, it, expect } from 'bun:test';
import * as module from '@/contexts/Shared/domain/DomainEventSubscriber';

describe('@/contexts/Shared/domain/DomainEventSubscriber', () => {
  it('loads', () => {
    expect(module).toBeDefined();
  });
});
