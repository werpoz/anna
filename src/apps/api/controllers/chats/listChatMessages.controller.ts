import type { Hono } from 'hono';
import { extractMessageContent, getContentType, proto } from 'baileys';
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

const extractContextInfo = (raw: Record<string, unknown> | null): proto.IContextInfo | null => {
  const message = (raw as { message?: proto.IMessage } | null)?.message;
  if (!message) {
    return null;
  }

  const content = extractMessageContent(message);
  return (content as { contextInfo?: proto.IContextInfo } | null)?.contextInfo ?? null;
};

const extractReplyInfo = (raw: Record<string, unknown> | null) => {
  const contextInfo = extractContextInfo(raw);
  const stanzaId = contextInfo?.stanzaId ?? null;
  if (!stanzaId) {
    return null;
  }

  const quotedMessage = contextInfo?.quotedMessage ?? null;
  if (!quotedMessage) {
    return {
      messageId: stanzaId,
      participant: contextInfo?.participant ?? null,
      type: null,
      text: null,
    };
  }

  const quotedContent = extractMessageContent(quotedMessage);
  const quotedType = quotedContent ? getContentType(quotedContent) : null;
  const quotedText =
    quotedContent?.conversation ??
    quotedContent?.extendedTextMessage?.text ??
    quotedContent?.imageMessage?.caption ??
    quotedContent?.videoMessage?.caption ??
    quotedContent?.documentMessage?.caption ??
    undefined;

  return {
    messageId: stanzaId,
    participant: contextInfo?.participant ?? null,
    type: quotedType ?? null,
    text: quotedText ?? null,
  };
};

const extractForwardInfo = (raw: Record<string, unknown> | null) => {
  const contextInfo = extractContextInfo(raw);
  const score = contextInfo?.forwardingScore;
  const isForwarded = Boolean(contextInfo?.isForwarded) || typeof score === 'number';
  if (!isForwarded) {
    return null;
  }

  return {
    isForwarded,
    forwardingScore: typeof score === 'number' ? score : null,
  };
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

    const messageIds = items.map((item) => item.messageId).filter(Boolean);
    const reactions = messageIds.length
      ? await deps.reactionRepository.listByMessageIds({
          sessionId: resolvedSessionId,
          messageIds,
        })
      : [];
    const media = messageIds.length
      ? await deps.mediaRepository.listByMessageIds({
          sessionId: resolvedSessionId,
          messageIds,
        })
      : [];

    const reactionsByMessage = reactions.reduce<Record<string, typeof reactions>>((acc, reaction) => {
      const bucket = acc[reaction.messageId] ?? [];
      bucket.push(reaction);
      acc[reaction.messageId] = bucket;
      return acc;
    }, {});

    const mediaByMessage = media.reduce<Record<string, Array<Record<string, unknown>>>>((acc, item) => {
      const bucket = acc[item.messageId] ?? [];
      bucket.push({
        kind: item.kind,
        url: item.url,
        mime: item.mime,
        size: item.size,
        fileName: item.fileName,
        width: item.width,
        height: item.height,
        duration: item.duration,
        sha256: item.sha256,
      });
      acc[item.messageId] = bucket;
      return acc;
    }, {});

    const mapped = items.map((item) => ({
      id: item.messageId,
      fromMe: item.fromMe,
      senderJid: item.senderJid,
      timestamp: item.timestamp?.toISOString() ?? null,
      type: item.type,
      text: item.text,
      status: item.status,
      statusAt: item.statusAt?.toISOString() ?? null,
      isEdited: item.isEdited,
      editedAt: item.editedAt?.toISOString() ?? null,
      isDeleted: item.isDeleted,
      deletedAt: item.deletedAt?.toISOString() ?? null,
      reactions: reactionsByMessage[item.messageId] ?? [],
      media: mediaByMessage[item.messageId]?.[0] ?? null,
      replyTo: extractReplyInfo(item.raw),
      forward: extractForwardInfo(item.raw),
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
