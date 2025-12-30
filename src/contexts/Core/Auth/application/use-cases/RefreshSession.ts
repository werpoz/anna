import type { RefreshTokenRepository } from '@/contexts/Core/Auth/domain/RefreshTokenRepository';
import type { RefreshTokenHasher } from '@/contexts/Core/Auth/domain/RefreshTokenHasher';
import { InvalidRefreshTokenError } from '@/contexts/Core/Auth/domain/errors/InvalidRefreshTokenError';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import type { LoginMetadata, TokenResult } from '@/contexts/Core/Auth/application/types';
import { AuthTokensService } from '@/contexts/Core/Auth/application/services/AuthTokensService';

export class RefreshSession {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenHasher: RefreshTokenHasher,
    private readonly userRepository: UserRepository,
    private readonly tokensService: AuthTokensService
  ) {}

  async execute(refreshToken: string, metadata: LoginMetadata = {}): Promise<TokenResult> {
    const tokenHash = this.refreshTokenHasher.hash(refreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.userRepository.search(new UserId(stored.userId));
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    return await this.tokensService.rotateRefreshToken(stored, metadata, user.id.value, user.email.value);
  }
}
