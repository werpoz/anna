import { Uuid } from '@/contexts/Shared/domain/value-object/Uuid';

export class UserPasswordResetToken extends Uuid {
  static readonly DEFAULT_TTL_MS = 60 * 60 * 1000;

  readonly expiresAt: Date;

  constructor(value: string, expiresAt: Date) {
    super(value);
    this.expiresAt = expiresAt;
  }

  static randomWithTtl(ttlMs: number = UserPasswordResetToken.DEFAULT_TTL_MS): UserPasswordResetToken {
    const now = Date.now();
    return new UserPasswordResetToken(crypto.randomUUID(), new Date(now + ttlMs));
  }

  isExpired(at: Date = new Date()): boolean {
    return at.getTime() > this.expiresAt.getTime();
  }
}
