import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ChatControllerDeps } from '@/apps/api/controllers/chats/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';
import { resolveSessionIdForTenant } from '@/apps/api/controllers/chats/helpers';

type DeleteChatMessagePayload = {
  sessionId?: string;
};

export const registerDeleteChatMessageRoute = (app: Hono<AppEnv>, deps: ChatControllerDeps): void => {
  app.delete('/chats/:jid/messages/:messageId', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const payload = await parseRequestBody<DeleteChatMessagePayload>(c);
    const sessionId = payload?.sessionId ?? c.req.query('sessionId') ?? undefined;

    const resolvedSessionId = await resolveSessionIdForTenant(
      deps.sessionRepository,
      auth.userId,
      sessionId
    );

    if (!resolvedSessionId) {
      return c.json({ message: 'session not found' }, 404);
    }

    const commandId = crypto.randomUUID();
    await deps.sessionCommandPublisher.publish({
      type: 'session.deleteMessage',
      commandId,
      sessionId: resolvedSessionId,
      messageId: c.req.param('messageId'),
    });

    return c.json({ commandId, sessionId: resolvedSessionId }, 202);
  });
};
