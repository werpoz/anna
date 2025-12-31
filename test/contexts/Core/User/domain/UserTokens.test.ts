import { describe, it, expect } from 'bun:test';
import { UserVerificationToken } from '@/contexts/Core/User/domain/UserVerificationToken';
import { UserPasswordResetToken } from '@/contexts/Core/User/domain/UserPasswordResetToken';


describe('UserVerificationToken', () => {
  it('generates with TTL and code', () => {
    const before = Date.now();
    const token = UserVerificationToken.randomWithTtl(60 * 1000);
    const after = Date.now();

    expect(token.value).toMatch(/[0-9a-fA-F-]{36}/);
    expect(token.code).toHaveLength(UserVerificationToken.DEFAULT_CODE_LENGTH);
    expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 60 * 1000);
    expect(token.expiresAt.getTime()).toBeLessThanOrEqual(after + 60 * 1000);
  });

  it('matches by token or code', () => {
    const token = new UserVerificationToken(
      '11111111-1111-1111-1111-111111111111',
      new Date('2024-01-01T00:00:00.000Z'),
      '123456'
    );

    expect(token.matches('11111111-1111-1111-1111-111111111111')).toBe(true);
    expect(token.matches('123456')).toBe(true);
    expect(token.matches(' 123456 ')).toBe(true);
    expect(token.matches('wrong')).toBe(false);
  });

  it('detects expiration', () => {
    const token = new UserVerificationToken(
      '11111111-1111-1111-1111-111111111111',
      new Date('2024-01-01T00:00:00.000Z'),
      '123456'
    );

    expect(token.isExpired(new Date('2024-01-02T00:00:00.000Z'))).toBe(true);
    expect(token.isExpired(new Date('2023-12-31T00:00:00.000Z'))).toBe(false);
  });
});

describe('UserPasswordResetToken', () => {
  it('generates with TTL', () => {
    const before = Date.now();
    const token = UserPasswordResetToken.randomWithTtl(5 * 60 * 1000);
    const after = Date.now();

    expect(token.value).toMatch(/[0-9a-fA-F-]{36}/);
    expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
    expect(token.expiresAt.getTime()).toBeLessThanOrEqual(after + 5 * 60 * 1000);
  });

  it('detects expiration', () => {
    const token = new UserPasswordResetToken(
      '22222222-2222-2222-2222-222222222222',
      new Date('2024-01-01T00:00:00.000Z')
    );

    expect(token.isExpired(new Date('2024-01-02T00:00:00.000Z'))).toBe(true);
    expect(token.isExpired(new Date('2023-12-31T00:00:00.000Z'))).toBe(false);
  });
});
