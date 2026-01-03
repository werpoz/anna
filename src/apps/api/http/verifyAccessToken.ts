import { jwtVerify } from 'jose';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { AuthPayload } from '@/apps/api/types';

export const verifyAccessToken = async (token: string): Promise<AuthPayload | null> => {
  try {
    const secret = new TextEncoder().encode(env.authJwtSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

    if (payload.tokenUse !== 'access' || !payload.sub) {
      return null;
    }

    return {
      userId: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
  } catch {
    return null;
  }
};
