import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ChatControllerDeps } from '@/apps/api/controllers/chats/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';
import { resolveSessionIdForTenant } from '@/apps/api/controllers/chats/helpers';

type ReactChatMessagePayload = {
  emoji?: string | null;
  sessionId?: string;
};

export const registerReactChatMessageRoute = (app: Hono<AppEnv>, deps: ChatControllerDeps): void => {
  app.post('/chats/:jid/messages/:messageId/reactions', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const payload = await parseRequestBody<ReactChatMessagePayload>(c);
    const emojiRaw = payload?.emoji;
    const emoji = typeof emojiRaw === 'string' ? emojiRaw.trim() : emojiRaw ?? null;
    if (emoji === undefined) {
      return c.json({ message: 'emoji is required (string or null to remove)' }, 400);
    }

    const resolvedSessionId = await resolveSessionIdForTenant(
      deps.sessionRepository,
      auth.userId,
      payload?.sessionId
    );

    if (!resolvedSessionId) {
      return c.json({ message: 'session not found' }, 404);
    }

    const commandId = crypto.randomUUID();
    await deps.sessionCommandPublisher.publish({
      type: 'session.reactMessage',
      commandId,
      sessionId: resolvedSessionId,
      messageId: c.req.param('messageId'),
      emoji: emoji && emoji.length ? emoji : null,
    });

    return c.json({ commandId, sessionId: resolvedSessionId }, 202);
  });
};
