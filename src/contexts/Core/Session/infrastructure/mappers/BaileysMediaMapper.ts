import { proto, extractMessageContent, getContentType } from 'baileys';

export type ResolvedMediaMeta = {
    messageId: string;
    chatJid: string;
    kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
    mime: string | null;
    size: number | null;
    fileName: string | null;
    sha256: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
};

export const resolveNumberValue = (
    value: number | bigint | { toNumber?: () => number } | null | undefined
): number | null => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'bigint') {
        return Number(value);
    }
    if (typeof value === 'object' && typeof value.toNumber === 'function') {
        return value.toNumber();
    }
    return null;
};

export const toBase64 = (value: Uint8Array | Buffer | null | undefined): string | null => {
    if (!value) {
        return null;
    }
    return Buffer.from(value).toString('base64');
};

export const unwrapMessage = (content: proto.IMessage | null | undefined): proto.IMessage | null | undefined => {
    if (!content) return null;

    if (content.viewOnceMessage?.message) return unwrapMessage(content.viewOnceMessage.message);
    if (content.viewOnceMessageV2?.message) return unwrapMessage(content.viewOnceMessageV2.message);
    if (content.viewOnceMessageV2Extension?.message) return unwrapMessage(content.viewOnceMessageV2Extension.message);
    if (content.ephemeralMessage?.message) return unwrapMessage(content.ephemeralMessage.message);
    if (content.documentWithCaptionMessage?.message) return unwrapMessage(content.documentWithCaptionMessage.message);
    if (content.associatedChildMessage?.message) return unwrapMessage(content.associatedChildMessage.message);

    // Unwrap Template Messages
    if (content.templateMessage?.hydratedTemplate) return unwrapMessage({ ...content.templateMessage.hydratedTemplate });
    if (content.templateMessage?.hydratedFourRowTemplate) return unwrapMessage({ ...content.templateMessage.hydratedFourRowTemplate });
    if (content.templateMessage?.fourRowTemplate) return unwrapMessage({ ...content.templateMessage.fourRowTemplate });

    return content;
};

export const resolveMediaMeta = (message: proto.IWebMessageInfo): ResolvedMediaMeta | null => {
    const key = message.key ?? {};
    const messageId = key.id ?? '';
    const chatJid = key.remoteJid ?? '';
    if (!messageId || !chatJid) {
        return null;
    }

    // Deeply unwrap the message content
    const unwrapped = unwrapMessage(message.message);
    const content = extractMessageContent(unwrapped);
    const contentType = getContentType(content);

    if (!contentType) {
        return null;
    }

    // Handle Template Messages (often contain media)
    if (contentType === 'templateMessage') {
        const template = content?.templateMessage?.hydratedTemplate || content?.templateMessage?.hydratedFourRowTemplate || content?.templateMessage?.fourRowTemplate;
        if (template) {
            if (template.imageMessage) {
                const image = template.imageMessage;
                return {
                    messageId,
                    chatJid,
                    kind: 'image',
                    mime: image.mimetype ?? null,
                    size: resolveNumberValue(image.fileLength),
                    fileName: null,
                    sha256: toBase64(image.fileSha256),
                    width: image.width ?? null,
                    height: image.height ?? null,
                    duration: null,
                };
            }
            if (template.videoMessage) {
                const video = template.videoMessage;
                return {
                    messageId,
                    chatJid,
                    kind: 'video',
                    mime: video.mimetype ?? null,
                    size: resolveNumberValue(video.fileLength),
                    fileName: null,
                    sha256: toBase64(video.fileSha256),
                    width: (video as { width?: number }).width ?? null,
                    height: (video as { height?: number }).height ?? null,
                    duration: video.seconds ?? null,
                };
            }
        }
    }

    if (contentType === 'imageMessage') {
        const image = content?.imageMessage;
        if (!image) {
            return null;
        }
        return {
            messageId,
            chatJid,
            kind: 'image',
            mime: image.mimetype ?? null,
            size: resolveNumberValue(image.fileLength),
            fileName: null,
            sha256: toBase64(image.fileSha256),
            width: image.width ?? null,
            height: image.height ?? null,
            duration: null,
        };
    }

    if (contentType === 'videoMessage') {
        const video = content?.videoMessage;
        if (!video) {
            return null;
        }
        return {
            messageId,
            chatJid,
            kind: 'video',
            mime: video.mimetype ?? null,
            size: resolveNumberValue(video.fileLength),
            fileName: null,
            sha256: toBase64(video.fileSha256),
            width: (video as { width?: number }).width ?? null,
            height: (video as { height?: number }).height ?? null,
            duration: video.seconds ?? null,
        };
    }

    if (contentType === 'audioMessage') {
        const audio = content?.audioMessage;
        if (!audio) {
            return null;
        }
        return {
            messageId,
            chatJid,
            kind: 'audio',
            mime: audio.mimetype ?? null,
            size: resolveNumberValue(audio.fileLength),
            fileName: null,
            sha256: toBase64(audio.fileSha256),
            width: null,
            height: null,
            duration: audio.seconds ?? null,
        };
    }

    if (contentType === 'documentMessage') {
        const doc = content?.documentMessage;
        if (!doc) {
            return null;
        }
        return {
            messageId,
            chatJid,
            kind: 'document',
            mime: doc.mimetype ?? null,
            size: resolveNumberValue(doc.fileLength),
            fileName: doc.fileName ?? null,
            sha256: toBase64(doc.fileSha256),
            width: null,
            height: null,
            duration: null,
        };
    }

    if (contentType === 'stickerMessage') {
        const sticker = content?.stickerMessage;
        if (!sticker) {
            return null;
        }
        return {
            messageId,
            chatJid,
            kind: 'sticker',
            mime: sticker.mimetype ?? null,
            size: resolveNumberValue(sticker.fileLength),
            fileName: null,
            sha256: toBase64(sticker.fileSha256),
            width: (sticker as { width?: number }).width ?? null,
            height: (sticker as { height?: number }).height ?? null,
            duration: null,
        };
    }

    return null;
};

export const isMediaMessage = (message: proto.IWebMessageInfo): boolean => Boolean(resolveMediaMeta(message));

export const resolveExtension = (mime: string | null | undefined): string => {
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

export const sanitizeFileName = (value: string): string => value.replace(/[\\/]/g, '_');

export const buildMediaKey = (params: {
    tenantId: string;
    sessionId: string;
    messageId: string;
    fileName: string;
}): string =>
    `tenants/${params.tenantId}/sessions/${params.sessionId}/messages/${params.messageId}/${sanitizeFileName(params.fileName)}`;

export const buildMediaMessage = (params: {
    media: {
        kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
        url: string;
        mime?: string | null;
        fileName?: string | null;
    };
    caption?: string;
    ptt: boolean;
}): Record<string, unknown> => {
    const { media, caption, ptt } = params;
    const mime = media.mime ?? undefined;

    if (media.kind === 'image') {
        return {
            image: { url: media.url },
            caption,
            mimetype: mime,
        };
    }

    if (media.kind === 'video') {
        return {
            video: { url: media.url },
            caption,
            mimetype: mime,
        };
    }

    if (media.kind === 'audio') {
        return {
            audio: { url: media.url },
            mimetype: mime,
            ptt,
        };
    }

    if (media.kind === 'sticker') {
        return {
            sticker: { url: media.url },
            mimetype: mime,
        };
    }

    return {
        document: { url: media.url },
        fileName: media.fileName ?? undefined,
        caption,
        mimetype: mime,
    };
};
