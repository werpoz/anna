import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ChatControllerDeps } from '@/apps/api/controllers/chats/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';
import { resolveSessionIdForTenant } from '@/apps/api/controllers/chats/helpers';

type SendChatMessagePayload = {
  content?: string;
  messageId?: string;
  sessionId?: string;
  replyToMessageId?: string;
  forwardMessageId?: string;
};

export const registerSendChatMessageRoute = (app: Hono<AppEnv>, deps: ChatControllerDeps): void => {
  app.post('/chats/:jid/messages', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const payload = await parseRequestBody<SendChatMessagePayload>(c);
    if (payload?.replyToMessageId && payload?.forwardMessageId) {
      return c.json({ message: 'replyToMessageId and forwardMessageId cannot be combined' }, 400);
    }

    if (!payload?.content && !payload?.forwardMessageId) {
      return c.json({ message: 'content is required unless forwarding' }, 400);
    }

    const resolvedSessionId = await resolveSessionIdForTenant(
      deps.sessionRepository,
      auth.userId,
      payload.sessionId
    );

    if (!resolvedSessionId) {
      return c.json({ message: 'session not found' }, 404);
    }

    const commandId = crypto.randomUUID();
    await deps.sessionCommandPublisher.publish({
      type: 'session.sendMessage',
      commandId,
      sessionId: resolvedSessionId,
      to: c.req.param('jid'),
      content: payload.content,
      messageId: payload.messageId,
      replyToMessageId: payload.replyToMessageId,
      forwardMessageId: payload.forwardMessageId,
    });

    return c.json({ commandId, sessionId: resolvedSessionId }, 202);
  });
};
