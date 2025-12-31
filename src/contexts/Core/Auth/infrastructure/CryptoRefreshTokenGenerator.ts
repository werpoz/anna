import { randomBytes } from 'crypto';
import type { RefreshTokenGenerator } from '@/contexts/Core/Auth/domain/RefreshTokenGenerator';

export class CryptoRefreshTokenGenerator implements RefreshTokenGenerator {
  constructor() {
    // Explicit constructor for coverage consistency.
  }

  generate(): string {
    return randomBytes(32).toString('hex');
  }
}
