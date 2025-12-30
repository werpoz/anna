import type { Hono } from 'hono';
import { VerifyUserCommand } from '@/contexts/Core/User/application/Verify/VerifyUserCommand';
import { UserDoesNotExistError } from '@/contexts/Core/User/domain/errors/UserDoesNotExistError';
import { UserAlreadyVerifiedError } from '@/contexts/Core/User/domain/errors/UserAlreadyVerifiedError';
import { UserVerificationTokenDoesNotMatchError } from '@/contexts/Core/User/domain/errors/UserVerificationTokenDoesNotMatchError';
import { UserVerificationTokenExpiredError } from '@/contexts/Core/User/domain/errors/UserVerificationTokenExpiredError';
import { UserVerificationNotPendingError } from '@/contexts/Core/User/domain/errors/UserVerificationNotPendingError';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import type { AppEnv } from '@/apps/api/types';
import type { UserControllerDeps } from '@/apps/api/controllers/users/types';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';
import { setRefreshCookie } from '@/apps/api/http/authCookies';

type VerifyPayload = {
  token?: string;
  code?: string;
};

export const registerVerifyUserRoute = (app: Hono<AppEnv>, deps: UserControllerDeps): void => {
  app.post('/users/:id/verify', async (c) => {
    const payload = await parseRequestBody<VerifyPayload>(c);
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
      setRefreshCookie(c, tokens.refreshToken, tokens.refreshTokenExpiresIn);
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
};
