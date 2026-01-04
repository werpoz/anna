import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { SessionControllerDeps } from '@/apps/api/controllers/sessions/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { parseRequestBody } from '@/apps/api/http/parseRequestBody';

type SendMessagePayload = {
  to?: string;
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
  replyToMessageId?: string;
  forwardMessageId?: string;
};

const normalizeMedia = (payload: SendMessagePayload) => {
  const media = payload.media ?? null;
  if (!media) {
    return null;
  }
  const kind = media.kind?.toLowerCase();
  if (kind !== 'image' && kind !== 'video' && kind !== 'audio' && kind !== 'document') {
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
    const media = normalizeMedia(payload ?? {});
    if (payload?.replyToMessageId && payload?.forwardMessageId) {
      return c.json({ message: 'replyToMessageId and forwardMessageId cannot be combined' }, 400);
    }
    if (media && payload?.forwardMessageId) {
      return c.json({ message: 'media and forwardMessageId cannot be combined' }, 400);
    }

    if (!payload?.to || (!payload?.content && !payload?.forwardMessageId && !media)) {
      return c.json({ message: 'to and content or media are required unless forwarding' }, 400);
    }

    if (payload?.media && !media) {
      return c.json({ message: 'invalid media payload' }, 400);
    }

    const commandId = crypto.randomUUID();

    await deps.sessionCommandPublisher.publish({
      type: 'session.sendMessage',
      commandId,
      sessionId: c.req.param('id'),
      to: payload.to,
      content: media ? undefined : payload.content,
      caption: media ? payload.caption ?? payload.content ?? null : null,
      ptt: payload.ptt ?? false,
      media,
      messageId: payload.messageId,
      replyToMessageId: payload.replyToMessageId,
      forwardMessageId: payload.forwardMessageId,
    });

    return c.json({ commandId }, 202);
  });
};
