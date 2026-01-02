import type { RefreshTokenRepository } from '@/contexts/Core/Auth/domain/RefreshTokenRepository';

export class LogoutAllUserSessions {
  constructor(private readonly refreshTokenRepository: RefreshTokenRepository) {}

  async execute(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }
}
