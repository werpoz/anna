import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { SessionControllerDeps } from '@/apps/api/controllers/sessions/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type StopSessionPayload = {
  reason?: string;
};

export const registerStopSessionRoute = (
  app: Hono<AppEnv>,
  deps: SessionControllerDeps
): void => {
  app.post('/sessions/:id/stop', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const payload = await parseRequestBody<StopSessionPayload>(c);
    const commandId = crypto.randomUUID();

    await deps.sessionCommandPublisher.publish({
      type: 'session.stop',
      commandId,
      sessionId: c.req.param('id'),
      reason: payload?.reason,
    });

    return c.json({ commandId }, 202);
  });
};
