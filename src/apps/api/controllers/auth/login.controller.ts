import type { Hono } from 'hono';
import { InvalidCredentialsError } from '@/contexts/Core/Auth/domain/errors/InvalidCredentialsError';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import type { AppEnv } from '@/apps/api/types';
import type { AuthControllerDeps } from '@/apps/api/controllers/auth/types';
import { setAccessCookie, setRefreshCookie } from '@/apps/api/http/authCookies';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type LoginPayload = {
  email?: string;
  password?: string;
};

export const registerLoginRoute = (app: Hono<AppEnv>, deps: AuthControllerDeps): void => {
  app.post('/auth/login', async (c) => {
    const payload = await parseRequestBody<LoginPayload>(c);

    if (!payload?.email || !payload?.password) {
      return c.json({ message: 'email and password are required' }, 400);
    }

    try {
      const tokens = await deps.authService.login(payload.email, payload.password, {
        userAgent: c.req.header('user-agent') ?? undefined,
        ip: c.req.header('x-forwarded-for') ?? undefined,
      });
      setRefreshCookie(c, tokens.refreshToken, tokens.refreshTokenExpiresIn);
      setAccessCookie(c, tokens.accessToken, tokens.accessTokenExpiresIn);

      return c.json(
        {
          accessTokenExpiresIn: tokens.accessTokenExpiresIn,
        },
        200
      );
    } catch (error) {
      if (error instanceof UserNotActiveError) {
        return c.json({ message: error.message }, 403);
      }

      if (error instanceof InvalidArgumentError) {
        return c.json({ message: error.message }, 400);
      }

      if (error instanceof InvalidCredentialsError) {
        return c.json({ message: error.message }, 401);
      }

      throw error;
    }
  });
};
