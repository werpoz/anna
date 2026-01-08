import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { AuthControllerDeps } from '@/apps/api/controllers/auth/types';
import { clearAllAuthCookies, getRefreshCookie } from '@/apps/api/http/authCookies';

export const registerLogoutRoute = (app: Hono<AppEnv>, deps: AuthControllerDeps): void => {
  app.post('/auth/logout', async (c) => {
    const refreshToken = getRefreshCookie(c);

    if (refreshToken) {
      await deps.authService.logout(refreshToken);
    }

    clearAllAuthCookies(c);
    return c.body(null, 204);
  });
};
