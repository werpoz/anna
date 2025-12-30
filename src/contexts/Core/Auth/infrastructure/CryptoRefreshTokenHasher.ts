import { createHash } from 'crypto';
import type { RefreshTokenHasher } from '@/contexts/Core/Auth/domain/RefreshTokenHasher';

export class CryptoRefreshTokenHasher implements RefreshTokenHasher {
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
