import type { MiddlewareHandler } from 'hono';
import { jwtVerify } from 'jose';
import { env } from '@/contexts/Shared/infrastructure/config/env';

export type AuthPayload = {
  userId: string;
  email?: string;
};

const getToken = (authorization: string | undefined): string | null => {
  if (!authorization) {
    return null;
  }
  const [, token] = authorization.split(' ');
  return token || null;
};

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const token = getToken(c.req.header('authorization'));
  if (!token) {
    return c.json({ message: 'missing access token' }, 401);
  }

  try {
    const secret = new TextEncoder().encode(env.authJwtSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

    if (payload.tokenUse !== 'access' || !payload.sub) {
      return c.json({ message: 'invalid access token' }, 401);
    }

    c.set('auth', {
      userId: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email : undefined,
    });

    await next();
  } catch {
    return c.json({ message: 'invalid access token' }, 401);
  }
};
