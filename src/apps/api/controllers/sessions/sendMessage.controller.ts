import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { SessionControllerDeps } from '@/apps/api/controllers/sessions/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type SendMessagePayload = {
  to?: string;
  content?: string;
  messageId?: string;
};

export const registerSendSessionMessageRoute = (
  app: Hono<AppEnv>,
  deps: SessionControllerDeps
): void => {
  app.post('/sessions/:id/messages', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const payload = await parseRequestBody<SendMessagePayload>(c);
    if (!payload?.to || !payload?.content) {
      return c.json({ message: 'to and content are required' }, 400);
    }

    const commandId = crypto.randomUUID();

    await deps.sessionCommandPublisher.publish({
      type: 'session.sendMessage',
      commandId,
      sessionId: c.req.param('id'),
      to: payload.to,
      content: payload.content,
      messageId: payload.messageId,
    });

    return c.json({ commandId }, 202);
  });
};
