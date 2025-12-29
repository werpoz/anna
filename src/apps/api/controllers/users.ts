import type { Hono } from 'hono';
import type { CommandBus } from '@/contexts/Shared/domain/CommandBus';
import type { QueryBus } from '@/contexts/Shared/domain/QueryBus';
import type { AuthService } from '@/contexts/Core/Auth/application/AuthService';
import { CreateUserCommand } from '@/contexts/Core/User/application/Create/CreateUserCommand';
import { FindUserQuery } from '@/contexts/Core/User/application/Find/FindUserQuery';
import { VerifyUserCommand } from '@/contexts/Core/User/application/Verify/VerifyUserCommand';
import type { UserResponse } from '@/contexts/Core/User/application/Find/UserResponse';
import { UserDoesNotExistError } from '@/contexts/Core/User/domain/errors/UserDoesNotExistError';
import { UserAlreadyVerifiedError } from '@/contexts/Core/User/domain/errors/UserAlreadyVerifiedError';
import { UserVerificationTokenDoesNotMatchError } from '@/contexts/Core/User/domain/errors/UserVerificationTokenDoesNotMatchError';
import { UserVerificationTokenExpiredError } from '@/contexts/Core/User/domain/errors/UserVerificationTokenExpiredError';
import { UserVerificationNotPendingError } from '@/contexts/Core/User/domain/errors/UserVerificationNotPendingError';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import { requireAuth, type AuthPayload } from '@/apps/api/middleware/requireAuth';
import { buildRefreshCookie } from '@/apps/api/controllers/authCookies';

type UserControllerDeps = {
  commandBus: CommandBus;
  queryBus: QueryBus;
  authService: AuthService;
};

const parseJsonBody = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

export const registerUserRoutes = (app: Hono, deps: UserControllerDeps): void => {
  app.post('/users', async (c) => {
    const payload = await parseJsonBody<{ id?: string; name?: string; email?: string; password?: string }>(
      c.req.raw
    );

    if (!payload?.name || !payload?.email || !payload?.password) {
      return c.json({ message: 'name, email and password are required' }, 400);
    }

    const userId = payload.id ?? crypto.randomUUID();
    try {
      await deps.commandBus.dispatch(
        new CreateUserCommand(userId, payload.name, payload.email, payload.password)
      );
    } catch (error) {
      if (error instanceof InvalidArgumentError) {
        return c.json({ message: error.message }, 400);
      }
      throw error;
    }

    return c.json({ id: userId }, 201);
  });

  app.post('/users/:id/verify', async (c) => {
    const payload = await parseJsonBody<{ token?: string; code?: string }>(c.req.raw);
    const tokenOrCode = payload?.token ?? payload?.code;

    if (!tokenOrCode) {
      return c.json({ message: 'token or code is required' }, 400);
    }

    try {
      await deps.commandBus.dispatch(new VerifyUserCommand(c.req.param('id'), tokenOrCode));
    } catch (error) {
      if (error instanceof UserDoesNotExistError) {
        return c.json({ message: error.message }, 404);
      }

      if (error instanceof UserAlreadyVerifiedError) {
        return c.json({ message: error.message }, 409);
      }

      if (error instanceof UserVerificationNotPendingError) {
        return c.json({ message: error.message }, 409);
      }

      if (error instanceof UserVerificationTokenDoesNotMatchError) {
        return c.json({ message: error.message }, 400);
      }

      if (error instanceof UserVerificationTokenExpiredError) {
        return c.json({ message: error.message }, 400);
      }

      throw error;
    }

    try {
      const tokens = await deps.authService.issueTokensForUserId(c.req.param('id'), {
        userAgent: c.req.header('user-agent') ?? undefined,
        ip: c.req.header('x-forwarded-for') ?? undefined,
      });
      c.header('Set-Cookie', buildRefreshCookie(tokens.refreshToken, tokens.refreshTokenExpiresIn));
      return c.json(
        {
          status: 'active',
          accessToken: tokens.accessToken,
          accessTokenExpiresIn: tokens.accessTokenExpiresIn,
        },
        200
      );
    } catch (error) {
      if (error instanceof UserDoesNotExistError) {
        return c.json({ message: error.message }, 404);
      }

      if (error instanceof UserNotActiveError) {
        return c.json({ message: error.message }, 403);
      }

      throw error;
    }
  });

  app.get('/users/me', requireAuth, async (c) => {
    const auth = c.get('auth') as AuthPayload | undefined;
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    try {
      const response = await deps.queryBus.ask<UserResponse>(new FindUserQuery(auth.userId));
      return c.json(response, 200);
    } catch (error) {
      if (error instanceof UserDoesNotExistError) {
        return c.json({ message: error.message }, 404);
      }
      throw error;
    }
  });
};
