import { describe, it, expect } from 'bun:test';
import { Query } from '@/contexts/Shared/domain/Query';

class TestQuery extends Query {}

describe('Query', () => {
  it('can be extended', () => {
    const query = new TestQuery();
    expect(query).toBeInstanceOf(Query);
  });
});
