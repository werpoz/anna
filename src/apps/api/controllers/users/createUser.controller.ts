import type { Hono } from 'hono';
import { CreateUserCommand } from '@/contexts/Core/User/application/Create/CreateUserCommand';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import type { AppEnv } from '@/apps/api/types';
import type { UserControllerDeps } from '@/apps/api/controllers/users/types';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type CreateUserPayload = {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
};

export const registerCreateUserRoute = (app: Hono<AppEnv>, deps: UserControllerDeps): void => {
  app.post('/users', async (c) => {
    const payload = await parseRequestBody<CreateUserPayload>(c);

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
};
