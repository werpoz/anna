import type { Hono } from 'hono';
import { InvalidCredentialsError } from '@/contexts/Core/Auth/domain/errors/InvalidCredentialsError';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { UserPasswordResetNotRequestedError } from '@/contexts/Core/User/domain/errors/UserPasswordResetNotRequestedError';
import { UserPasswordResetTokenDoesNotMatchError } from '@/contexts/Core/User/domain/errors/UserPasswordResetTokenDoesNotMatchError';
import { UserPasswordResetTokenExpiredError } from '@/contexts/Core/User/domain/errors/UserPasswordResetTokenExpiredError';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import type { AppEnv } from '@/apps/api/types';
import type { AuthControllerDeps } from '@/apps/api/controllers/auth/types';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type ResetPayload = {
  email?: string;
  token?: string;
  newPassword?: string;
};

export const registerPasswordResetConfirmRoute = (
  app: Hono<AppEnv>,
  deps: AuthControllerDeps
): void => {
  app.post('/auth/password-reset/confirm', async (c) => {
    const payload = await parseRequestBody<ResetPayload>(c);

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
