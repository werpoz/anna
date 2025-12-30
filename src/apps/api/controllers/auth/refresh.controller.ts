import type { Hono } from 'hono';
import { InvalidRefreshTokenError } from '@/contexts/Core/Auth/domain/errors/InvalidRefreshTokenError';
import type { AppEnv } from '@/apps/api/types';
import type { AuthControllerDeps } from '@/apps/api/controllers/auth/types';
import { getRefreshCookie, setRefreshCookie } from '@/apps/api/http/authCookies';

export const registerRefreshRoute = (app: Hono<AppEnv>, deps: AuthControllerDeps): void => {
  app.post('/auth/refresh', async (c) => {
    const refreshToken = getRefreshCookie(c);

    if (!refreshToken) {
      return c.json({ message: 'refresh token is required' }, 401);
    }

    try {
      const tokens = await deps.authService.refresh(refreshToken, {
        userAgent: c.req.header('user-agent') ?? undefined,
        ip: c.req.header('x-forwarded-for') ?? undefined,
      });
      setRefreshCookie(c, tokens.refreshToken, tokens.refreshTokenExpiresIn);
      return c.json(
        {
          accessToken: tokens.accessToken,
          accessTokenExpiresIn: tokens.accessTokenExpiresIn,
        },
        200
      );
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        return c.json({ message: error.message }, 401);
      }

      throw error;
    }
  });
};
