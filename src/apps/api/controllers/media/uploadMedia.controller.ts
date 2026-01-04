import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { MediaControllerDeps } from '@/apps/api/controllers/media/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { resolveSessionIdForTenant } from '@/apps/api/controllers/chats/helpers';
import { S3Storage } from '@/contexts/Shared/infrastructure/Storage/S3Storage';

const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

const sanitizeFileName = (value: string): string => value.replace(/[\\/]/g, '_');

const resolveExtension = (mime: string | null | undefined): string => {
  if (!mime) {
    return 'bin';
  }
  const normalized = mime.split(';')[0]?.trim() ?? mime;
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'application/pdf': 'pdf',
  };
  return map[normalized] ?? normalized.split('/')[1] ?? 'bin';
};

type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'sticker';

const isMediaKind = (value: string): value is MediaKind =>
  value === 'image' || value === 'video' || value === 'audio' || value === 'document' || value === 'sticker';

const resolveMediaKind = (value: unknown): MediaKind | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const kind = value.toLowerCase();
  if (isMediaKind(kind)) {
    return kind;
  }
  return null;
};

const buildUploadKey = (params: {
  tenantId: string;
  sessionId: string;
  fileName: string;
}): string =>
  `tenants/${params.tenantId}/sessions/${params.sessionId}/uploads/${crypto.randomUUID()}/${sanitizeFileName(params.fileName)}`;

export const registerUploadMediaRoute = (app: Hono<AppEnv>, deps: MediaControllerDeps): void => {
  app.post('/media', requireAuth, async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ message: 'missing access token' }, 401);
    }

    const form = await c.req.formData();
    const file = form.get('file');
    const kind = resolveMediaKind(form.get('kind'));
    const sessionIdParam = form.get('sessionId')?.toString() ?? c.req.query('sessionId');

    if (!kind) {
      return c.json({ message: 'kind is required (image|video|audio|document|sticker)' }, 400);
    }

    if (!(file instanceof File)) {
      return c.json({ message: 'file is required' }, 400);
    }

    if (file.size > MAX_MEDIA_BYTES) {
      return c.json({ message: 'file is too large' }, 413);
    }

    const resolvedSessionId = await resolveSessionIdForTenant(
      deps.sessionRepository,
      auth.userId,
      sessionIdParam ?? undefined
    );

    if (!resolvedSessionId) {
      return c.json({ message: 'session not found' }, 404);
    }

    let storage: S3Storage;
    try {
      storage = new S3Storage();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'media storage not configured';
      return c.json({ message }, 503);
    }

    const inferredName =
      file.name && file.name !== 'blob'
        ? file.name
        : `${kind}-${crypto.randomUUID()}.${resolveExtension(file.type)}`;
    const key = buildUploadKey({
      tenantId: auth.userId,
      sessionId: resolvedSessionId,
      fileName: inferredName,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.uploadBuffer({
      key,
      body: buffer,
      contentType: file.type || undefined,
    });

    return c.json(
      {
        sessionId: resolvedSessionId,
        media: {
          kind,
          url: result.url,
          mime: file.type || null,
          fileName: inferredName,
          size: file.size,
        },
      },
      201
    );
  });
};
