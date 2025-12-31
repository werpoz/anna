import { describe, it, expect } from 'bun:test';
import { InvalidCredentialsError } from '@/contexts/Core/Auth/domain/errors/InvalidCredentialsError';


describe('InvalidCredentialsError', () => {
  it('uses the default message', () => {
    const error = new InvalidCredentialsError();

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Invalid credentials');
  });
});
