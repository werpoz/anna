import type { RefreshTokenRepository } from '@/contexts/Core/Auth/domain/RefreshTokenRepository';
import type { RefreshTokenHasher } from '@/contexts/Core/Auth/domain/RefreshTokenHasher';

export class LogoutUser {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenHasher: RefreshTokenHasher
  ) {}

  async execute(refreshToken: string): Promise<void> {
    const tokenHash = this.refreshTokenHasher.hash(refreshToken);
    await this.refreshTokenRepository.revoke(tokenHash);
  }
}
