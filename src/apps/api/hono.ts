import { Hono } from 'hono';
import { buildAppContext } from '@/contexts/Shared/infrastructure/di/bootstrap';
import { registerUserRoutes } from '@/apps/api/controllers/users';
import { registerMetricsRoutes } from '@/apps/api/controllers/metrics';
import { registerAuthRoutes } from '@/apps/api/controllers/auth';
import { initTelemetry } from '@/contexts/Shared/infrastructure/observability/telemetry';
import { env } from '@/contexts/Shared/infrastructure/config/env';

initTelemetry(`${env.otelServiceName}-hono`);

const { commandBus, queryBus, authService } = buildAppContext();

const app = new Hono();

registerUserRoutes(app, { commandBus, queryBus, authService });
registerAuthRoutes(app, { authService });
registerMetricsRoutes(app);

Bun.serve({
  port: 3000,
  fetch: app.fetch,
});

console.log('Hono app listening on http://localhost:3000');
