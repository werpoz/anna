import { describe, it, expect } from 'bun:test';
import { InvalidRefreshTokenError } from '@/contexts/Core/Auth/domain/errors/InvalidRefreshTokenError';


describe('InvalidRefreshTokenError', () => {
  it('uses the default message', () => {
    const error = new InvalidRefreshTokenError();

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Invalid refresh token');
  });
});
