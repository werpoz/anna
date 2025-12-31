import { describe, it, expect } from 'bun:test';
import { User } from '@/contexts/Core/User/domain/User';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserName } from '@/contexts/Core/User/domain/UserName';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';
import { UserVerificationToken } from '@/contexts/Core/User/domain/UserVerificationToken';
import { UserPasswordResetToken } from '@/contexts/Core/User/domain/UserPasswordResetToken';
import { UserStatus } from '@/contexts/Core/User/domain/UserStatus';
import { UserAlreadyVerifiedError } from '@/contexts/Core/User/domain/errors/UserAlreadyVerifiedError';
import { UserVerificationTokenDoesNotMatchError } from '@/contexts/Core/User/domain/errors/UserVerificationTokenDoesNotMatchError';
import { UserVerificationTokenExpiredError } from '@/contexts/Core/User/domain/errors/UserVerificationTokenExpiredError';
import { UserVerificationNotPendingError } from '@/contexts/Core/User/domain/errors/UserVerificationNotPendingError';
import { UserPasswordResetNotRequestedError } from '@/contexts/Core/User/domain/errors/UserPasswordResetNotRequestedError';
import { UserPasswordResetTokenDoesNotMatchError } from '@/contexts/Core/User/domain/errors/UserPasswordResetTokenDoesNotMatchError';
import { UserPasswordResetTokenExpiredError } from '@/contexts/Core/User/domain/errors/UserPasswordResetTokenExpiredError';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';

const buildVerificationToken = (): UserVerificationToken => {
  return new UserVerificationToken(
    '11111111-1111-1111-1111-111111111111',
    new Date('2024-01-02T00:00:00.000Z'),
    '123456'
  );
};

const buildUser = (): User => {
  return User.create({
    id: new UserId('11111111-1111-1111-1111-111111111111'),
    name: new UserName('Ada Lovelace'),
    email: new UserEmail('ada@example.com'),
    passwordHash: new UserPasswordHash('hashed-password'),
    verificationToken: buildVerificationToken(),
  });
};

const buildActiveUser = (overrides?: { passwordHash?: string }): User => {
  const now = new Date('2024-01-01T12:00:00.000Z');
  return User.fromPrimitives({
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    status: 'active',
    passwordHash: overrides?.passwordHash ?? 'hashed-password',
    verificationToken: '33333333-3333-3333-3333-333333333333',
    verificationCode: '654321',
    verificationTokenExpiresAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
    verifiedAt: now.toISOString(),
    passwordResetToken: null,
    passwordResetTokenExpiresAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastLoginAt: null,
  });
};

describe('User', () => {
  it('creates a pending user and records domain events', () => {
    const user = buildUser();
    const events = user.pullDomainEvents();

    expect(user.status.value).toBe('pending_verification');
    expect(user.verificationToken.value).toBe('11111111-1111-1111-1111-111111111111');
    expect(user.verificationToken.code).toBe('123456');
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.eventName)).toEqual([
      'user.registered',
      'user.verification.token_issued',
    ]);
  });

  it('verifies user using token or code', () => {
    const user = buildUser();

    user.verify('123456', new Date('2024-01-01T00:00:00.000Z'));
    expect(user.status.value).toBe('active');
    expect(user.verifiedAt).not.toBeNull();

    const events = user.pullDomainEvents();
    expect(events[events.length - 1]?.eventName).toBe('user.verified');
  });

  it('throws when verifying twice', () => {
    const user = buildUser();
    user.verify(user.verificationToken.value, new Date('2024-01-01T00:00:00.000Z'));

    expect(() => user.verify(user.verificationToken.value)).toThrow(UserAlreadyVerifiedError);
  });

  it('throws when verification token does not match', () => {
    const user = buildUser();

    expect(() => user.verify('wrong')).toThrow(UserVerificationTokenDoesNotMatchError);
  });

  it('throws when verification token is expired', () => {
    const user = buildUser();

    expect(() => user.verify(user.verificationToken.value, new Date('2025-01-01T00:00:00.000Z'))).toThrow(
      UserVerificationTokenExpiredError
    );
  });

  it('resends verification token only when pending', () => {
    const user = buildUser();
    user.pullDomainEvents();

    user.resendVerificationToken();
    const events = user.pullDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0]?.eventName).toBe('user.verification.token_issued');

    user.verify(user.verificationToken.value);
    expect(() => user.resendVerificationToken()).toThrow(UserVerificationNotPendingError);
  });

  it('requests password reset only for active users', () => {
    const user = buildUser();

    expect(() => user.requestPasswordReset()).toThrow(UserNotActiveError);

    const activeUser = buildActiveUser();
    activeUser.requestPasswordReset(10 * 60 * 1000);
    const events = activeUser.pullDomainEvents();

    expect(activeUser.passwordResetToken).not.toBeNull();
    expect(events[0]?.eventName).toBe('user.password_reset.requested');
  });

  it('resets password with a valid token', () => {
    const activeUser = buildActiveUser();
    activeUser.requestPasswordReset(10 * 60 * 1000);
    const resetToken = activeUser.passwordResetToken as UserPasswordResetToken;

    activeUser.resetPassword(resetToken.value, new UserPasswordHash('new-hash'));
    const events = activeUser.pullDomainEvents();

    expect(activeUser.passwordResetToken).toBeNull();
    expect(events[events.length - 1]?.eventName).toBe('user.password_reset.completed');
  });

  it('throws when resetting password without token', () => {
    const activeUser = buildActiveUser();

    expect(() =>
      activeUser.resetPassword('token', new UserPasswordHash('new-hash'))
    ).toThrow(UserPasswordResetNotRequestedError);
  });

  it('throws when password reset token does not match', () => {
    const activeUser = buildActiveUser();
    activeUser.requestPasswordReset(10 * 60 * 1000);

    expect(() =>
      activeUser.resetPassword('wrong', new UserPasswordHash('new-hash'))
    ).toThrow(UserPasswordResetTokenDoesNotMatchError);
  });

  it('throws when password reset token is expired', () => {
    const activeUser = buildActiveUser();
    activeUser.requestPasswordReset(1);
    const resetToken = activeUser.passwordResetToken as UserPasswordResetToken;

    expect(() =>
      activeUser.resetPassword(resetToken.value, new UserPasswordHash('new-hash'), new Date('2030-01-01T00:00:00.000Z'))
    ).toThrow(UserPasswordResetTokenExpiredError);
  });

  it('records login time', () => {
    const user = buildUser();
    const loginAt = new Date('2024-01-01T10:00:00.000Z');

    user.recordLogin(loginAt);

    expect(user.lastLoginAt?.toISOString()).toBe(loginAt.toISOString());
    expect(user.updatedAt.toISOString()).toBe(loginAt.toISOString());
  });

  it('round-trips primitives', () => {
    const primitives = {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      status: UserStatus.pendingVerification().value,
      passwordHash: 'hash',
      verificationToken: '55555555-5555-5555-5555-555555555555',
      verificationCode: '777777',
      verificationTokenExpiresAt: new Date('2024-01-03T00:00:00.000Z').toISOString(),
      verifiedAt: null,
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
      lastLoginAt: null,
    };

    const user = User.fromPrimitives(primitives);
    expect(user.toPrimitives()).toEqual(primitives);
  });
});
