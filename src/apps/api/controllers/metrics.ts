import type { Hono } from 'hono';
import { getMetrics, metricsContentType } from '@/contexts/Shared/infrastructure/observability/metrics';

export const registerMetricsRoutes = (app: Hono): void => {
  app.get('/metrics', async (c) => {
    c.header('content-type', metricsContentType);
    return c.text(await getMetrics());
  });
};
