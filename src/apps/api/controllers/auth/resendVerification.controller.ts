import type { Hono } from 'hono';
import { UserVerificationNotPendingError } from '@/contexts/Core/User/domain/errors/UserVerificationNotPendingError';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import type { AppEnv } from '@/apps/api/types';
import type { AuthControllerDeps } from '@/apps/api/controllers/auth/types';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type ResendPayload = {
  email?: string;
};

export const registerResendVerificationRoute = (app: Hono<AppEnv>, deps: AuthControllerDeps): void => {
  app.post('/auth/resend-verification', async (c) => {
    const payload = await parseRequestBody<ResendPayload>(c);

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
};
