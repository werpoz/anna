import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ChatControllerDeps } from '@/apps/api/controllers/chats/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { resolveSessionIdForTenant } from '@/apps/api/controllers/chats/helpers';

export const registerListChatsRoute = (app: Hono<AppEnv>, deps: ChatControllerDeps): void => {
  app.get('/chats', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const sessionId = c.req.query('sessionId') ?? undefined;
    const resolvedSessionId = await resolveSessionIdForTenant(
      deps.sessionRepository,
      auth.userId,
      sessionId
    );

    if (!resolvedSessionId) {
      return c.json({ sessionId: null, items: [] }, 200);
    }

    const items = await deps.chatRepository.listByTenant(auth.userId, resolvedSessionId);
    return c.json({ sessionId: resolvedSessionId, items }, 200);
  });
};
