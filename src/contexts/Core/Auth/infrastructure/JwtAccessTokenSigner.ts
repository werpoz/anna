import { SignJWT } from 'jose';
import type { AccessTokenSigner } from '@/contexts/Core/Auth/domain/AccessTokenSigner';

export class JwtAccessTokenSigner implements AccessTokenSigner {
  private readonly secret: Uint8Array;

  constructor(secret: string) {
    this.secret = new TextEncoder().encode(secret);
  }

  async sign(userId: string, email: string, expiresInSeconds: number): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return await new SignJWT({ email, tokenUse: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt(now)
      .setExpirationTime(now + expiresInSeconds)
      .sign(this.secret);
  }
}
