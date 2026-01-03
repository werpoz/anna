import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { SessionControllerDeps } from '@/apps/api/controllers/sessions/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';

export const registerDeleteSessionRoute = (
  app: Hono<AppEnv>,
  deps: SessionControllerDeps
): void => {
  app.delete('/sessions/:id', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const commandId = crypto.randomUUID();

    await deps.sessionCommandPublisher.publish({
      type: 'session.delete',
      commandId,
      sessionId: c.req.param('id'),
    });

    return c.json({ commandId }, 202);
  });
};
