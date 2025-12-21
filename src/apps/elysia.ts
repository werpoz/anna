import { Elysia } from 'elysia';
import { buildAppContext } from '../contexts/Shared/infrastructure/di/bootstrap';
import { CreateUserCommand } from '../contexts/User/application/Create/CreateUserCommand';
import { FindUserQuery } from '../contexts/User/application/Find/FindUserQuery';
import type { UserResponse } from '../contexts/User/application/Find/UserResponse';
import { UserDoesNotExistError } from '../contexts/User/domain/UserDoesNotExistError';
import { getMetrics, metricsContentType } from '../contexts/Shared/infrastructure/observability/metrics';
import { initTelemetry } from '../contexts/Shared/infrastructure/observability/telemetry';
import { env } from '../contexts/Shared/infrastructure/config/env';

initTelemetry(`${env.otelServiceName}-elysia`);

const { commandBus, queryBus } = buildAppContext();

const app = new Elysia();

app.post('/users', async ({ body, set }) => {
  const payload = body as { id?: string; name?: string; email?: string };

  if (!payload?.name || !payload?.email) {
    set.status = 400;
    return { message: 'name and email are required' };
  }

  const userId = payload.id ?? crypto.randomUUID();
  await commandBus.dispatch(new CreateUserCommand(userId, payload.name, payload.email));

  set.status = 201;
  return { id: userId };
});

app.get('/users/:id', async ({ params, set }) => {
  try {
    const response = await queryBus.ask<UserResponse>(new FindUserQuery(params.id));
    return response;
  } catch (error) {
    if (error instanceof UserDoesNotExistError) {
      set.status = 404;
      return { message: error.message };
    }

    throw error;
  }
});

app.get('/metrics', async ({ set }) => {
  set.headers['content-type'] = metricsContentType;
  return await getMetrics();
});

app.listen(3000);
console.log('Elysia app listening on http://localhost:3000');
