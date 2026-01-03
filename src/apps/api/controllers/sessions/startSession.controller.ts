import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { SessionControllerDeps } from '@/apps/api/controllers/sessions/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type StartSessionPayload = {
  sessionId?: string;
};

export const registerStartSessionRoute = (
  app: Hono<AppEnv>,
  deps: SessionControllerDeps
): void => {
  app.post('/sessions', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const payload = await parseRequestBody<StartSessionPayload>(c);
    const sessionId = payload?.sessionId ?? crypto.randomUUID();
    const commandId = crypto.randomUUID();

    await deps.sessionCommandPublisher.publish({
      type: 'session.start',
      commandId,
      sessionId,
      tenantId: auth.userId,
    });

    return c.json({ sessionId, commandId }, 202);
  });
};
