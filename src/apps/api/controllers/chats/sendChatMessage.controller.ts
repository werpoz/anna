import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ChatControllerDeps } from '@/apps/api/controllers/chats/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';
import { resolveSessionIdForTenant } from '@/apps/api/controllers/chats/helpers';

type SendChatMessagePayload = {
  content?: string;
  caption?: string;
  ptt?: boolean;
  media?: {
    kind?: string;
    url?: string;
    mime?: string | null;
    fileName?: string | null;
    size?: number | null;
  } | null;
  messageId?: string;
  sessionId?: string;
  replyToMessageId?: string;
  forwardMessageId?: string;
};

type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'sticker';

const isMediaKind = (value: string): value is MediaKind =>
  value === 'image' || value === 'video' || value === 'audio' || value === 'document' || value === 'sticker';

const normalizeMedia = (payload: SendChatMessagePayload) => {
  const media = payload.media ?? null;
  if (!media) {
    return null;
  }
  const kind = media.kind?.toLowerCase();
  if (!kind || !isMediaKind(kind)) {
    return null;
  }
  if (!media.url) {
    return null;
  }
  return {
    kind,
    url: media.url,
    mime: media.mime ?? null,
    fileName: media.fileName ?? null,
    size: typeof media.size === 'number' ? media.size : null,
  };
};

const resolveSendJid = async (
  deps: ChatControllerDeps,
  sessionId: string,
  inputJid: string
): Promise<string> => {
  const chatKey = await deps.chatAliasRepository.resolveChatKey({ sessionId, alias: inputJid });
  if (!chatKey) {
    return inputJid;
  }
  const aliases = await deps.chatAliasRepository.listAliasesByChatKey({ sessionId, chatKey });
  const preferred = aliases.find(
    (alias) => alias.endsWith('@s.whatsapp.net') || alias.endsWith('@g.us')
  );
  return preferred ?? inputJid;
};

export const registerSendChatMessageRoute = (app: Hono<AppEnv>, deps: ChatControllerDeps): void => {
  app.post('/chats/:jid/messages', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const payload = (await parseRequestBody<SendChatMessagePayload>(c)) ?? {};
    const media = normalizeMedia(payload);
    if (payload?.replyToMessageId && payload?.forwardMessageId) {
      return c.json({ message: 'replyToMessageId and forwardMessageId cannot be combined' }, 400);
    }
    if (media && payload?.forwardMessageId) {
      return c.json({ message: 'media and forwardMessageId cannot be combined' }, 400);
    }

    if (!payload?.content && !payload?.forwardMessageId && !media) {
      return c.json({ message: 'content or media is required unless forwarding' }, 400);
    }

    if (payload?.media && !media) {
      return c.json({ message: 'invalid media payload' }, 400);
    }

    const resolvedSessionId = await resolveSessionIdForTenant(
      deps.sessionRepository,
      auth.userId,
      payload.sessionId
    );

    if (!resolvedSessionId) {
      return c.json({ message: 'session not found' }, 404);
    }

    const inputJid = c.req.param('jid');
    const targetJid = await resolveSendJid(deps, resolvedSessionId, inputJid);
    const commandId = crypto.randomUUID();
    await deps.sessionCommandPublisher.publish({
      type: 'session.sendMessage',
      commandId,
      sessionId: resolvedSessionId,
      to: targetJid,
      content: media ? undefined : payload.content,
      caption: media ? payload.caption ?? payload.content ?? null : null,
      ptt: payload.ptt ?? false,
      media,
      messageId: payload.messageId,
      replyToMessageId: payload.replyToMessageId,
      forwardMessageId: payload.forwardMessageId,
    });

    return c.json({ commandId, sessionId: resolvedSessionId }, 202);
  });
};
