import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { AuthControllerDeps } from '@/apps/api/controllers/auth/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { clearRefreshCookie } from '@/apps/api/http/authCookies';

export const registerLogoutAllRoute = (app: Hono<AppEnv>, deps: AuthControllerDeps): void => {
  app.post('/auth/logout-all', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    await deps.authService.logoutAll(auth.userId);
    clearRefreshCookie(c);
    return c.body(null, 204);
  });
};
