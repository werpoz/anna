import { Hono } from 'hono';
import { serve } from 'bun';
import { buildAppContext } from '../contexts/Shared/infrastructure/di/bootstrap';
import { CreateUserCommand } from '../contexts/User/application/Create/CreateUserCommand';
import { FindUserQuery } from '../contexts/User/application/Find/FindUserQuery';
import type { UserResponse } from '../contexts/User/application/Find/UserResponse';
import { UserDoesNotExistError } from '../contexts/User/domain/UserDoesNotExistError';

const { commandBus, queryBus } = buildAppContext();

const app = new Hono();

app.post('/users', async (c) => {
  const payload = (await c.req.json()) as { id?: string; name?: string; email?: string };

  if (!payload?.name || !payload?.email) {
    return c.json({ message: 'name and email are required' }, 400);
  }

  const userId = payload.id ?? crypto.randomUUID();
  await commandBus.dispatch(new CreateUserCommand(userId, payload.name, payload.email));

  return c.json({ id: userId }, 201);
});

app.get('/users/:id', async (c) => {
  try {
    const response = await queryBus.ask<UserResponse>(new FindUserQuery(c.req.param('id')));
    return c.json(response, 200);
  } catch (error) {
    if (error instanceof UserDoesNotExistError) {
      return c.json({ message: error.message }, 404);
    }

    throw error;
  }
});

serve({
  fetch: app.fetch,
  port: 3001,
});

console.log('Hono app listening on http://localhost:3001');
