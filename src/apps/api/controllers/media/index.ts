import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { MediaControllerDeps } from '@/apps/api/controllers/media/types';
import { registerUploadMediaRoute } from '@/apps/api/controllers/media/uploadMedia.controller';

export const registerMediaRoutes = (app: Hono<AppEnv>, deps: MediaControllerDeps): void => {
  registerUploadMediaRoute(app, deps);
};
