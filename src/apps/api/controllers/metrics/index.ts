import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import { registerGetMetricsRoute } from '@/apps/api/controllers/metrics/getMetrics.controller';

export const registerMetricsRoutes = (app: Hono<AppEnv>): void => {
  registerGetMetricsRoute(app);
};
