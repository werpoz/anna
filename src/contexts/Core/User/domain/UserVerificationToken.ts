import { Uuid } from '@/contexts/Shared/domain/value-object/Uuid';

export class UserVerificationToken extends Uuid {
  static readonly DEFAULT_TTL_MS = 1 * 60 * 60 * 1000;
  static readonly DEFAULT_CODE_LENGTH = 6;

  readonly expiresAt: Date;
  readonly code: string;

  constructor(value: string, expiresAt: Date, code?: string) {
    super(value);
    this.expiresAt = expiresAt;
    this.code = code ?? value;
  }

  static override random(): UserVerificationToken {
    return UserVerificationToken.randomWithTtl(UserVerificationToken.DEFAULT_TTL_MS);
  }

  static randomWithTtl(ttlMs: number): UserVerificationToken {
    const now = Date.now();
    return new UserVerificationToken(
      crypto.randomUUID(),
      new Date(now + ttlMs),
      UserVerificationToken.generateCode()
    );
  }

  static generateCode(length: number = UserVerificationToken.DEFAULT_CODE_LENGTH): string {
    const max = 10 ** length;
    const code = Math.floor(Math.random() * max);
    return String(code).padStart(length, '0');
  }

  matches(value: string): boolean {
    const normalized = value.trim();
    return normalized === this.value || normalized === this.code;
  }

  isExpired(at: Date = new Date()): boolean {
    return at.getTime() > this.expiresAt.getTime();
  }
}
