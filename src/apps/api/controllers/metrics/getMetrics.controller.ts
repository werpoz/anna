import type { Hono } from 'hono';
import { getMetrics, metricsContentType } from '@/contexts/Shared/infrastructure/observability/metrics';
import type { AppEnv } from '@/apps/api/types';

export const registerGetMetricsRoute = (app: Hono<AppEnv>): void => {
  app.get('/metrics', async (c) => {
    c.header('content-type', metricsContentType);
    return c.text(await getMetrics());
  });
};
