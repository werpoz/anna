import { proto, extractMessageContent, getContentType, BufferJSON } from 'baileys';
import type {
    SessionMessageSummary,
    SessionMessageStatusUpdate,
    SessionMessageEditUpdate,
    SessionMessageDeleteUpdate,
    SessionMessageReactionUpdate,
} from '@/contexts/Core/Session/application/SessionProvider';
import { resolveTimestampSeconds, normalizeTimestampSeconds } from './BaileysUtils';

export const resolveMessageStatus = (status: proto.WebMessageInfo.Status | null | undefined): string | undefined => {
    if (status === null || status === undefined) {
        return undefined;
    }
    if (typeof status === 'number') {
        return proto.WebMessageInfo.Status[status] ?? String(status);
    }
    return String(status);
};

export const buildMessageSummary = (message: proto.IWebMessageInfo): SessionMessageSummary => {
    const key = message.key ?? {};
    const content = extractMessageContent(message.message);
    const contentType = getContentType(content);
    const text =
        content?.conversation ??
        content?.extendedTextMessage?.text ??
        content?.imageMessage?.caption ??
        content?.videoMessage?.caption ??
        content?.documentMessage?.caption ??
        undefined;
    const raw = JSON.parse(JSON.stringify(message, BufferJSON.replacer)) as Record<string, unknown>;

    return {
        id: key.id ?? '',
        remoteJid: key.remoteJid ?? undefined,
        participant: key.participant ?? undefined,
        fromMe: key.fromMe ?? false,
        timestamp: message.messageTimestamp ? Number(message.messageTimestamp) : undefined,
        type: contentType ?? undefined,
        text,
        status: resolveMessageStatus(message.status),
        statusAt: (message as any).statusP ? Number((message as any).statusP) : undefined,
        raw,
    };
};

export const buildMessageStatusUpdate = (
    key: proto.IMessageKey | null | undefined,
    update: Partial<proto.IWebMessageInfo> | null | undefined
): SessionMessageStatusUpdate | null => {
    const messageId = key?.id ?? '';
    if (!messageId) {
        return null;
    }

    const status = resolveMessageStatus(update?.status);
    const statusAt = null;
    if (!status) {
        return null;
    }

    return {
        messageId,
        remoteJid: key?.remoteJid ?? undefined,
        participant: key?.participant ?? undefined,
        fromMe: key?.fromMe ?? undefined,
        status,
        statusAt,
    };
};

export const buildReceiptStatusUpdate = (
    key: proto.IMessageKey | null | undefined,
    receipt: proto.IUserReceipt | null | undefined
): SessionMessageStatusUpdate | null => {
    const messageId = key?.id ?? '';
    if (!messageId) {
        return null;
    }

    const playedAt = resolveTimestampSeconds(receipt?.playedTimestamp);
    const readAt = resolveTimestampSeconds(receipt?.readTimestamp);
    const deliveredAt = resolveTimestampSeconds(receipt?.receiptTimestamp);
    const status =
        playedAt !== null ? 'played' : readAt !== null ? 'read' : deliveredAt !== null ? 'delivered' : null;
    const statusAt = playedAt ?? readAt ?? deliveredAt;
    if (!status && statusAt === null) {
        return null;
    }

    return {
        messageId,
        remoteJid: key?.remoteJid ?? undefined,
        participant: key?.participant ?? undefined,
        fromMe: key?.fromMe ?? undefined,
        status,
        statusAt,
    };
};

export const buildMessageEditUpdate = (
    key: proto.IMessageKey | null | undefined,
    update: Partial<proto.IWebMessageInfo> | null | undefined
): SessionMessageEditUpdate | null => {
    const messageId = key?.id ?? '';
    if (!messageId) {
        return null;
    }

    const message = update?.message;
    if (!message) {
        return null;
    }

    const content = extractMessageContent(message);
    const type = content ? getContentType(content) : null;
    const text =
        content?.conversation ??
        content?.extendedTextMessage?.text ??
        content?.imageMessage?.caption ??
        content?.videoMessage?.caption ??
        content?.documentMessage?.caption ??
        undefined;

    if (typeof text !== 'string' && !type) {
        return null;
    }

    return {
        messageId,
        remoteJid: key?.remoteJid ?? undefined,
        participant: key?.participant ?? undefined,
        fromMe: key?.fromMe ?? undefined,
        type: type ?? null,
        text: text ?? null,
        editedAt: resolveTimestampSeconds(update?.messageTimestamp) ?? Math.floor(Date.now() / 1000),
    };
};

export const buildMessageDeleteUpdate = (
    key: proto.IMessageKey | null | undefined
): SessionMessageDeleteUpdate | null => {
    const messageId = key?.id ?? '';
    const remoteJid = key?.remoteJid ?? '';
    if (!messageId || !remoteJid) {
        return null;
    }

    return {
        messageId,
        remoteJid,
        participant: key?.participant ?? undefined,
        fromMe: key?.fromMe ?? undefined,
        deletedAt: Math.floor(Date.now() / 1000),
    };
};

export const buildReactionUpdateFromMessage = (
    message: proto.IWebMessageInfo,
    selfJid: string | null
): SessionMessageReactionUpdate | null => {
    const content = extractMessageContent(message.message);
    const reaction = (content as { reactionMessage?: proto.Message.IReactionMessage } | null)?.reactionMessage;
    if (!reaction?.key) {
        return null;
    }
    const targetKey = reaction.key;
    const messageId = targetKey.id ?? '';
    const chatJid = targetKey.remoteJid ?? message.key?.remoteJid ?? '';
    if (!messageId || !chatJid) {
        return null;
    }
    const actorKey = message.key ?? {};
    const fromMe = actorKey.fromMe ?? false;
    const actorJid =
        actorKey.participant ??
        (fromMe ? selfJid ?? null : actorKey.remoteJid ?? null) ??
        null;
    if (!actorJid) {
        return null;
    }
    const emoji = reaction.text ?? null;
    const reactedAt = normalizeTimestampSeconds(reaction.senderTimestampMs);
    return {
        messageId,
        chatJid,
        actorJid,
        fromMe,
        emoji,
        reactedAt,
        removed: !emoji,
    };
};

export const buildReactionUpdateFromEvent = (
    update: { key: proto.IMessageKey; reaction: proto.IReaction },
    selfJid: string | null
): SessionMessageReactionUpdate | null => {
    const targetKey = update.key ?? null;
    const messageId = targetKey?.id ?? '';
    const chatJid = targetKey?.remoteJid ?? '';
    if (!messageId || !chatJid) {
        return null;
    }
    const reaction = update.reaction ?? null;
    const actorKey = reaction?.key ?? null;
    const fromMe = actorKey?.fromMe ?? false;
    const actorJid =
        actorKey?.participant ??
        (fromMe ? selfJid ?? null : actorKey?.remoteJid ?? null) ??
        null;
    if (!actorJid) {
        return null;
    }
    const emoji = reaction?.text ?? null;
    const reactedAt = normalizeTimestampSeconds(reaction?.senderTimestampMs ?? null);
    return {
        messageId,
        chatJid,
        actorJid,
        fromMe,
        emoji,
        reactedAt,
        removed: !emoji,
    };
};

export const isReactionMessage = (message: proto.IWebMessageInfo): boolean => {
    const content = extractMessageContent(message.message);
    return Boolean(content && (content as { reactionMessage?: unknown }).reactionMessage);
};

export const isStatusUpdate = (
    value: SessionMessageStatusUpdate | null
): value is SessionMessageStatusUpdate => Boolean(value);

export const isEditUpdate = (value: SessionMessageEditUpdate | null): value is SessionMessageEditUpdate =>
    Boolean(value);

export const isDeleteUpdate = (value: SessionMessageDeleteUpdate | null): value is SessionMessageDeleteUpdate =>
    Boolean(value);

export const isReactionUpdate = (
    value: SessionMessageReactionUpdate | null
): value is SessionMessageReactionUpdate => Boolean(value);
