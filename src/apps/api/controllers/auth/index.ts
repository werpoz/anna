import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { AuthControllerDeps } from '@/apps/api/controllers/auth/types';
import { registerLoginRoute } from '@/apps/api/controllers/auth/login.controller';
import { registerRefreshRoute } from '@/apps/api/controllers/auth/refresh.controller';
import { registerLogoutRoute } from '@/apps/api/controllers/auth/logout.controller';
import { registerResendVerificationRoute } from '@/apps/api/controllers/auth/resendVerification.controller';
import { registerPasswordResetRoute } from '@/apps/api/controllers/auth/passwordReset.controller';
import { registerPasswordResetConfirmRoute } from '@/apps/api/controllers/auth/passwordResetConfirm.controller';

export const registerAuthRoutes = (app: Hono<AppEnv>, deps: AuthControllerDeps): void => {
  registerLoginRoute(app, deps);
  registerRefreshRoute(app, deps);
  registerLogoutRoute(app, deps);
  registerResendVerificationRoute(app, deps);
  registerPasswordResetRoute(app, deps);
  registerPasswordResetConfirmRoute(app, deps);
};
