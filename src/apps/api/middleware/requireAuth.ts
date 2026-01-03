import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import { verifyAccessToken } from '@/apps/api/http/verifyAccessToken';

const getToken = (authorization: string | undefined): string | null => {
  if (!authorization) {
    return null;
  }
  const [, token] = authorization.split(' ');
  return token || null;
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getToken(c.req.header('authorization'));
  if (!token) {
    return c.json({ message: 'missing access token' }, 401);
  }

  const auth = await verifyAccessToken(token);
  if (!auth) {
    return c.json({ message: 'invalid access token' }, 401);
  }

  c.set('auth', auth);
  await next();
};
