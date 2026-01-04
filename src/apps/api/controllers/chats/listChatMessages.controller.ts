import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ChatControllerDeps } from '@/apps/api/controllers/chats/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { resolveSessionIdForTenant } from '@/apps/api/controllers/chats/helpers';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const parseLimit = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

const decodeCursor = (value: string | undefined): { timestamp: Date; messageId: string } | null => {
  if (!value) {
    return null;
  }
  try {
    const raw = Buffer.from(value, 'base64').toString('utf-8');
    const data = JSON.parse(raw) as { ts?: string; id?: string };
    if (!data?.ts || !data?.id) {
      return null;
    }
    const timestamp = new Date(data.ts);
    if (Number.isNaN(timestamp.getTime())) {
      return null;
    }
    return { timestamp, messageId: data.id };
  } catch {
    return null;
  }
};

const encodeCursor = (timestamp: Date, messageId: string): string => {
  const payload = JSON.stringify({ ts: timestamp.toISOString(), id: messageId });
  return Buffer.from(payload).toString('base64');
};

export const registerListChatMessagesRoute = (app: Hono<AppEnv>, deps: ChatControllerDeps): void => {
  app.get('/chats/:jid/messages', requireAuth, async (c) => {
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

    const chatJid = c.req.param('jid');
    const limit = parseLimit(c.req.query('limit') ?? undefined);
    const cursor = decodeCursor(c.req.query('cursor') ?? undefined);
    const includeRaw = c.req.query('includeRaw') === 'true';

    const items = await deps.messageRepository.searchByChat({
      sessionId: resolvedSessionId,
      chatJid,
      limit,
      cursor: cursor ?? undefined,
    });

    const mapped = items.map((item) => ({
      id: item.messageId,
      fromMe: item.fromMe,
      senderJid: item.senderJid,
      timestamp: item.timestamp?.toISOString() ?? null,
      type: item.type,
      text: item.text,
      raw: includeRaw ? item.raw : undefined,
    }));

    const last = items[items.length - 1];
    const nextCursor = last?.timestamp ? encodeCursor(last.timestamp, last.messageId) : null;

    return c.json({
      sessionId: resolvedSessionId,
      items: mapped,
      nextCursor: items.length === limit ? nextCursor : null,
    });
  });
};
