import type {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '@/contexts/Core/Auth/domain/RefreshTokenRepository';
import { injectable } from 'tsyringe';

@injectable()
export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly tokens = new Map<string, RefreshTokenRecord>();

  async create(record: RefreshTokenRecord): Promise<void> {
    this.tokens.set(record.tokenHash, record);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.tokens.get(tokenHash) ?? null;
  }

  async revoke(tokenHash: string, replacedByTokenHash?: string): Promise<void> {
    const record = this.tokens.get(tokenHash);
    if (!record) {
      return;
    }

    record.revokedAt = new Date();
    record.replacedByTokenHash = replacedByTokenHash ?? null;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const record of this.tokens.values()) {
      if (record.userId === userId && !record.revokedAt) {
        record.revokedAt = new Date();
      }
    }
  }
}
