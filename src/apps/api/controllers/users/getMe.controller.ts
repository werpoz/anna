import type { Hono } from 'hono';
import { FindUserQuery } from '@/contexts/Core/User/application/Find/FindUserQuery';
import type { UserResponse } from '@/contexts/Core/User/application/Find/UserResponse';
import { UserDoesNotExistError } from '@/contexts/Core/User/domain/errors/UserDoesNotExistError';
import type { AppEnv } from '@/apps/api/types';
import type { UserControllerDeps } from '@/apps/api/controllers/users/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';

export const registerGetMeRoute = (app: Hono<AppEnv>, deps: UserControllerDeps): void => {
  app.get('/users/me', requireAuth, async (c) => {
    const auth = c.get('auth');
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
