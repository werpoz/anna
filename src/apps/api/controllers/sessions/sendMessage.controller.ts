import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { SessionControllerDeps } from '@/apps/api/controllers/sessions/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type SendMessagePayload = {
  to?: string;
  content?: string;
  messageId?: string;
  replyToMessageId?: string;
  forwardMessageId?: string;
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
    if (payload?.replyToMessageId && payload?.forwardMessageId) {
      return c.json({ message: 'replyToMessageId and forwardMessageId cannot be combined' }, 400);
    }

    if (!payload?.to || (!payload?.content && !payload?.forwardMessageId)) {
      return c.json({ message: 'to and content are required unless forwarding' }, 400);
    }

    const commandId = crypto.randomUUID();

    await deps.sessionCommandPublisher.publish({
      type: 'session.sendMessage',
      commandId,
      sessionId: c.req.param('id'),
      to: payload.to,
      content: payload.content,
      messageId: payload.messageId,
      replyToMessageId: payload.replyToMessageId,
      forwardMessageId: payload.forwardMessageId,
    });

    return c.json({ commandId }, 202);
  });
};
