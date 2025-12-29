import { SignJWT } from 'jose';
import { createHash, randomBytes } from 'crypto';
import type { RefreshTokenRepository } from '@/contexts/Core/Auth/domain/RefreshTokenRepository';
import { InvalidCredentialsError } from '@/contexts/Core/Auth/domain/errors/InvalidCredentialsError';
import { InvalidRefreshTokenError } from '@/contexts/Core/Auth/domain/errors/InvalidRefreshTokenError';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { UserDoesNotExistError } from '@/contexts/Core/User/domain/errors/UserDoesNotExistError';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';

type TokenResult = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
};

type LoginMetadata = {
  userAgent?: string;
  ip?: string;
};

const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

const generateRefreshToken = (): string => {
  return randomBytes(32).toString('hex');
};

export class AuthService {
  private readonly secret: Uint8Array;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly eventBus: EventBus
  ) {
    this.secret = new TextEncoder().encode(env.authJwtSecret);
  }

  async login(email: string, password: string, metadata: LoginMetadata = {}): Promise<TokenResult> {
    const user = await this.userRepository.searchByEmail(new UserEmail(email));
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (user.status.value !== 'active') {
      throw new UserNotActiveError(user.id, user.status.value);
    }

    const isValid = await Bun.password.verify(password, user.passwordHash.value);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    user.recordLogin(new Date());
    await this.userRepository.save(user);

    return await this.issueTokens(user.id.value, user.email.value, metadata);
  }

  async issueTokensForUserId(userId: string, metadata: LoginMetadata = {}): Promise<TokenResult> {
    const user = await this.userRepository.search(new UserId(userId));
    if (!user) {
      throw new UserDoesNotExistError(new UserId(userId));
    }

    if (user.status.value !== 'active') {
      throw new UserNotActiveError(user.id, user.status.value);
    }

    return await this.issueTokens(user.id.value, user.email.value, metadata);
  }

  async refresh(refreshToken: string, metadata: LoginMetadata = {}): Promise<TokenResult> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.userRepository.search(new UserId(stored.userId));
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    return await this.rotateRefreshToken(stored, metadata, user.id.value, user.email.value);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.refreshTokenRepository.revoke(tokenHash);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.userRepository.searchByEmail(new UserEmail(email));
    if (!user) {
      return;
    }

    user.resendVerificationToken();
    await this.userRepository.save(user);
    await this.eventBus.publish(user.pullDomainEvents());
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.searchByEmail(new UserEmail(email));
    if (!user) {
      return;
    }

    user.requestPasswordReset(env.authPasswordResetTtlMs);
    await this.userRepository.save(user);
    await this.eventBus.publish(user.pullDomainEvents());
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.searchByEmail(new UserEmail(email));
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordHash = await Bun.password.hash(newPassword);
    user.resetPassword(token, new UserPasswordHash(passwordHash));
    await this.userRepository.save(user);
    await this.eventBus.publish(user.pullDomainEvents());
  }

  private async rotateRefreshToken(
    stored: { tokenHash: string },
    metadata: LoginMetadata,
    userId: string,
    email: string
  ): Promise<TokenResult> {
    const newRefreshToken = generateRefreshToken();
    const newHash = hashToken(newRefreshToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.authRefreshTokenTtlMs);

    await this.refreshTokenRepository.revoke(stored.tokenHash, newHash);
    await this.refreshTokenRepository.create({
      tokenHash: newHash,
      userId,
      createdAt: now,
      expiresAt,
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: metadata.userAgent,
      ip: metadata.ip,
    });

    const accessToken = await this.signAccessToken(userId, email);
    return {
      accessToken,
      accessTokenExpiresIn: Math.floor(env.authAccessTokenTtlMs / 1000),
      refreshToken: newRefreshToken,
      refreshTokenExpiresIn: Math.floor(env.authRefreshTokenTtlMs / 1000),
    };
  }

  private async issueTokens(userId: string, email: string, metadata: LoginMetadata): Promise<TokenResult> {
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.authRefreshTokenTtlMs);

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

    const accessToken = await this.signAccessToken(userId, email);
    return {
      accessToken,
      accessTokenExpiresIn: Math.floor(env.authAccessTokenTtlMs / 1000),
      refreshToken,
      refreshTokenExpiresIn: Math.floor(env.authRefreshTokenTtlMs / 1000),
    };
  }

  private async signAccessToken(userId: string, email: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = Math.floor(env.authAccessTokenTtlMs / 1000);
    return await new SignJWT({ email, tokenUse: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .sign(this.secret);
  }
}
