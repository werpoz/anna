import { describe, it, expect } from 'bun:test';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

describe('InvalidArgumentError', () => {
  it('uses provided message', () => {
    const error = new InvalidArgumentError('boom');
    expect(error.message).toBe('boom');
  });

  it('is an Error instance', () => {
    const error = new InvalidArgumentError('boom');
    expect(error).toBeInstanceOf(Error);
  });
});
