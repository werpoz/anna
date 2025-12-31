import { createHash } from 'crypto';
import type { RefreshTokenHasher } from '@/contexts/Core/Auth/domain/RefreshTokenHasher';

export class CryptoRefreshTokenHasher implements RefreshTokenHasher {
  constructor() {
    // Explicit constructor for coverage consistency.
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
