import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { UserControllerDeps } from '@/apps/api/controllers/users/types';
import { registerCreateUserRoute } from '@/apps/api/controllers/users/createUser.controller';
import { registerVerifyUserRoute } from '@/apps/api/controllers/users/verifyUser.controller';
import { registerGetMeRoute } from '@/apps/api/controllers/users/getMe.controller';

export const registerUserRoutes = (app: Hono<AppEnv>, deps: UserControllerDeps): void => {
  registerCreateUserRoute(app, deps);
  registerVerifyUserRoute(app, deps);
  registerGetMeRoute(app, deps);
};
