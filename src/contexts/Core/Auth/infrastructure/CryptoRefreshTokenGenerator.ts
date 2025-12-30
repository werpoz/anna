import { randomBytes } from 'crypto';
import type { RefreshTokenGenerator } from '@/contexts/Core/Auth/domain/RefreshTokenGenerator';

export class CryptoRefreshTokenGenerator implements RefreshTokenGenerator {
  generate(): string {
    return randomBytes(32).toString('hex');
  }
}
