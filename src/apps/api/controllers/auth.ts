import type { Hono } from 'hono';
import type { AuthService } from '@/contexts/Core/Auth/application/AuthService';
import { InvalidCredentialsError } from '@/contexts/Core/Auth/domain/errors/InvalidCredentialsError';
import { InvalidRefreshTokenError } from '@/contexts/Core/Auth/domain/errors/InvalidRefreshTokenError';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import { UserVerificationNotPendingError } from '@/contexts/Core/User/domain/errors/UserVerificationNotPendingError';
import { UserPasswordResetNotRequestedError } from '@/contexts/Core/User/domain/errors/UserPasswordResetNotRequestedError';
import { UserPasswordResetTokenDoesNotMatchError } from '@/contexts/Core/User/domain/errors/UserPasswordResetTokenDoesNotMatchError';
import { UserPasswordResetTokenExpiredError } from '@/contexts/Core/User/domain/errors/UserPasswordResetTokenExpiredError';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import { buildRefreshCookie, clearRefreshCookie } from '@/apps/api/controllers/authCookies';
import type { AppEnv } from '@/apps/api/types';

type AuthControllerDeps = {
  authService: AuthService;
};

type LoginPayload = {
  email?: string;
  password?: string;
};

type ResetPayload = {
  email?: string;
  token?: string;
  newPassword?: string;
};

const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) {
      return acc;
    }
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

const parseJsonBody = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

export const registerAuthRoutes = (app: Hono<AppEnv>, deps: AuthControllerDeps): void => {
  app.post('/auth/login', async (c) => {
    const payload = await parseJsonBody<LoginPayload>(c.req.raw);

    if (!payload?.email || !payload?.password) {
      return c.json({ message: 'email and password are required' }, 400);
    }

    try {
      const tokens = await deps.authService.login(payload.email, payload.password, {
        userAgent: c.req.header('user-agent') ?? undefined,
        ip: c.req.header('x-forwarded-for') ?? undefined,
      });
      c.header('Set-Cookie', buildRefreshCookie(tokens.refreshToken, tokens.refreshTokenExpiresIn));
      return c.json(
        {
          accessToken: tokens.accessToken,
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

  app.post('/auth/refresh', async (c) => {
    const cookies = parseCookies(c.req.header('cookie'));
    const refreshToken = cookies[env.authRefreshCookieName];

    if (!refreshToken) {
      return c.json({ message: 'refresh token is required' }, 401);
    }

    try {
      const tokens = await deps.authService.refresh(refreshToken, {
        userAgent: c.req.header('user-agent') ?? undefined,
        ip: c.req.header('x-forwarded-for') ?? undefined,
      });
      c.header('Set-Cookie', buildRefreshCookie(tokens.refreshToken, tokens.refreshTokenExpiresIn));
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

  app.post('/auth/logout', async (c) => {
    const cookies = parseCookies(c.req.header('cookie'));
    const refreshToken = cookies[env.authRefreshCookieName];

    if (refreshToken) {
      await deps.authService.logout(refreshToken);
    }

    c.header('Set-Cookie', clearRefreshCookie());
    return c.body(null, 204);
  });

  app.post('/auth/resend-verification', async (c) => {
    const payload = await parseJsonBody<{ email?: string }>(c.req.raw);

    if (!payload?.email) {
      return c.json({ message: 'email is required' }, 400);
    }

    try {
      await deps.authService.resendVerification(payload.email);
    } catch (error) {
      if (error instanceof UserVerificationNotPendingError) {
        return c.json({ message: error.message }, 409);
      }

      if (error instanceof InvalidArgumentError) {
        return c.json({ message: error.message }, 400);
      }

      throw error;
    }

    return c.json({ status: 'ok' }, 200);
  });

  app.post('/auth/password-reset', async (c) => {
    const payload = await parseJsonBody<{ email?: string }>(c.req.raw);

    if (!payload?.email) {
      return c.json({ message: 'email is required' }, 400);
    }

    try {
      await deps.authService.requestPasswordReset(payload.email);
    } catch (error) {
      if (error instanceof UserNotActiveError) {
        return c.json({ message: error.message }, 403);
      }

      if (error instanceof InvalidArgumentError) {
        return c.json({ message: error.message }, 400);
      }

      throw error;
    }

    return c.json({ status: 'ok' }, 200);
  });

  app.post('/auth/password-reset/confirm', async (c) => {
    const payload = await parseJsonBody<ResetPayload>(c.req.raw);

    if (!payload?.email || !payload?.token || !payload?.newPassword) {
      return c.json({ message: 'email, token and newPassword are required' }, 400);
    }

    try {
      await deps.authService.resetPassword(payload.email, payload.token, payload.newPassword);
    } catch (error) {
      if (error instanceof UserNotActiveError) {
        return c.json({ message: error.message }, 403);
      }

      if (
        error instanceof UserPasswordResetNotRequestedError ||
        error instanceof UserPasswordResetTokenDoesNotMatchError ||
        error instanceof UserPasswordResetTokenExpiredError ||
        error instanceof InvalidCredentialsError
      ) {
        return c.json({ message: 'invalid password reset request' }, 400);
      }

      if (error instanceof InvalidArgumentError) {
        return c.json({ message: error.message }, 400);
      }

      throw error;
    }

    return c.json({ status: 'ok' }, 200);
  });
};
