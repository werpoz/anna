import type { Hono } from 'hono';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import type { AppEnv } from '@/apps/api/types';
import type { AuthControllerDeps } from '@/apps/api/controllers/auth/types';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type PasswordResetPayload = {
  email?: string;
};

export const registerPasswordResetRoute = (app: Hono<AppEnv>, deps: AuthControllerDeps): void => {
  app.post('/auth/password-reset', async (c) => {
    const payload = await parseRequestBody<PasswordResetPayload>(c);

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
};
