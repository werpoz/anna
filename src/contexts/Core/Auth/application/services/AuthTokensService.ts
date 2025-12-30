import type { RefreshTokenRepository } from '@/contexts/Core/Auth/domain/RefreshTokenRepository';
import type { AccessTokenSigner } from '@/contexts/Core/Auth/domain/AccessTokenSigner';
import type { RefreshTokenHasher } from '@/contexts/Core/Auth/domain/RefreshTokenHasher';
import type { RefreshTokenGenerator } from '@/contexts/Core/Auth/domain/RefreshTokenGenerator';
import type { LoginMetadata, TokenResult } from '@/contexts/Core/Auth/application/types';

export class AuthTokensService {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly accessTokenSigner: AccessTokenSigner,
    private readonly refreshTokenHasher: RefreshTokenHasher,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly accessTokenTtlMs: number,
    private readonly refreshTokenTtlMs: number
  ) {}

  async issueTokens(userId: string, email: string, metadata: LoginMetadata): Promise<TokenResult> {
    return await this.createRefreshToken(userId, email, metadata);
  }

  async rotateRefreshToken(
    stored: { tokenHash: string },
    metadata: LoginMetadata,
    userId: string,
    email: string
  ): Promise<TokenResult> {
    const refreshToken = this.refreshTokenGenerator.generate();
    const tokenHash = this.refreshTokenHasher.hash(refreshToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.refreshTokenTtlMs);

    await this.refreshTokenRepository.revoke(stored.tokenHash, tokenHash);
    await this.refreshTokenRepository.create({
      tokenHash,
      userId,
      createdAt: now,
      expiresAt,
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: metadata.userAgent,
      ip: metadata.ip,
    });

    return await this.buildTokenResult(userId, email, refreshToken);
  }

  private async createRefreshToken(
    userId: string,
    email: string,
    metadata: LoginMetadata
  ): Promise<TokenResult> {
    const refreshToken = this.refreshTokenGenerator.generate();
    const tokenHash = this.refreshTokenHasher.hash(refreshToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.refreshTokenTtlMs);

    await this.refreshTokenRepository.create({
      tokenHash,
      userId,
      createdAt: now,
      expiresAt,
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: metadata.userAgent,
      ip: metadata.ip,
    });
    return await this.buildTokenResult(userId, email, refreshToken);
  }

  private async buildTokenResult(userId: string, email: string, refreshToken: string): Promise<TokenResult> {
    const accessTokenExpiresIn = Math.floor(this.accessTokenTtlMs / 1000);
    const refreshTokenExpiresIn = Math.floor(this.refreshTokenTtlMs / 1000);
    const accessToken = await this.accessTokenSigner.sign(userId, email, accessTokenExpiresIn);

    return {
      accessToken,
      accessTokenExpiresIn,
      refreshToken,
      refreshTokenExpiresIn,
    };
  }
}
