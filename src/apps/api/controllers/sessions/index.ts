import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { SessionControllerDeps } from '@/apps/api/controllers/sessions/types';
import { registerStartSessionRoute } from '@/apps/api/controllers/sessions/startSession.controller';
import { registerStopSessionRoute } from '@/apps/api/controllers/sessions/stopSession.controller';
import { registerSendSessionMessageRoute } from '@/apps/api/controllers/sessions/sendMessage.controller';
import { registerDeleteSessionRoute } from '@/apps/api/controllers/sessions/deleteSession.controller';

export const registerSessionRoutes = (app: Hono<AppEnv>, deps: SessionControllerDeps): void => {
  registerStartSessionRoute(app, deps);
  registerStopSessionRoute(app, deps);
  registerDeleteSessionRoute(app, deps);
  registerSendSessionMessageRoute(app, deps);
};
