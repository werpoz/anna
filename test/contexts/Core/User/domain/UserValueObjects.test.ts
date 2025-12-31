import { describe, it, expect } from 'bun:test';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserName } from '@/contexts/Core/User/domain/UserName';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';
import { UserStatus } from '@/contexts/Core/User/domain/UserStatus';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';


describe('User value objects', () => {
  it('validates email format', () => {
    expect(() => new UserEmail('ada@example.com')).not.toThrow();
    expect(() => new UserEmail('invalid-email')).toThrow(InvalidArgumentError);
  });

  it('validates name is not empty', () => {
    expect(() => new UserName('Ada')).not.toThrow();
    expect(() => new UserName('   ')).toThrow(InvalidArgumentError);
  });

  it('validates password hash is not empty', () => {
    expect(() => new UserPasswordHash('hash')).not.toThrow();
    expect(() => new UserPasswordHash('   ')).toThrow(InvalidArgumentError);
  });

  it('supports user status values', () => {
    expect(UserStatus.pendingVerification().value).toBe('pending_verification');
    expect(UserStatus.active().value).toBe('active');
    expect(UserStatus.invited().value).toBe('invited');
    expect(UserStatus.suspended().value).toBe('suspended');
    expect(UserStatus.deleted().value).toBe('deleted');
  });

  it('throws on invalid status value', () => {
    expect(() => new UserStatus('invalid' as any)).toThrow(InvalidArgumentError);
  });
});
