import pLimit from 'p-limit';
import type { WASocket, proto } from 'baileys';
import { isMediaMessage } from '../mappers/BaileysMediaMapper';
import { downloadMediaMessage } from 'baileys';
import type {
    SessionProviderHandlers,
    SessionHistorySyncPayload,
    SessionMessagesUpsertPayload,
    SessionMessagesUpdatePayload,
    SessionMessagesDeletePayload,
    SessionMessagesReactionPayload,
    SessionMessagesEditPayload,
    SessionMessageMediaUpdate,
    SessionMessagesMediaPayload
} from '@/contexts/Core/Session/application/SessionProvider';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import type { MediaStorage } from '@/contexts/Shared/domain/Storage/MediaStorage';
import {
    buildMessageSummary,
    buildReactionUpdateFromMessage,
    isReactionUpdate,
    isReactionMessage,
    buildReactionUpdateFromEvent,
    buildMessageStatusUpdate,
    isStatusUpdate,
    buildMessageEditUpdate,
    isEditUpdate,
    buildReceiptStatusUpdate,
    buildMessageDeleteUpdate,
    isDeleteUpdate
} from '../mappers/BaileysMessageMapper';
import { buildChatSummary } from '../mappers/BaileysChatMapper';
import { resolveMediaMeta, resolveExtension, buildMediaKey, unwrapMessage } from '../mappers/BaileysMediaMapper';
import { resolveTimestampSeconds } from '../mappers/BaileysUtils';

const MAX_HISTORY_MESSAGES = 100000;
const MAX_UPSERT_MESSAGES = 200;
const MAX_REACTIONS = 1000;
// MAX_MEDIA_DOWNLOADS removed in favor of concurrency limit
const MAX_MEDIA_BYTES = 1000 * 1024 * 1024; // 1GB
const CONCURRENCY_LIMIT = 16;

// Shared limit for all downloads in this worker/instance
const limit = pLimit(CONCURRENCY_LIMIT);

export class BaileysMessageHandler {
    constructor(
        private readonly sessionId: string,
        private readonly tenantId: string,
        private readonly requestHandlers: SessionProviderHandlers,
        private readonly mediaStorage: MediaStorage | null
    ) { }

    handle(socket: WASocket): void {
        this.handleHistorySync(socket);
        this.handleMessagesUpsert(socket);
        this.handleMessagesUpdate(socket);
        this.handleMessageReceiptUpdate(socket);
        this.handleMessagesDelete(socket);
        this.handleMessagesReaction(socket);
    }

    private handleHistorySync(socket: WASocket): void {
        socket.ev.on('messaging-history.set', (payload) => {
            if (!this.requestHandlers.onHistorySync) {
                return;
            }

            const messages = payload.messages ?? [];
            const chats = payload.chats ?? [];

            const reactions = this.requestHandlers.onMessagesReaction
                ? messages
                    .map((message) => buildReactionUpdateFromMessage(message, socket.user?.id ?? null))
                    .filter(isReactionUpdate)
                    .slice(0, MAX_REACTIONS)
                : [];
            const nonReactionMessages = messages.filter((message) => !isReactionMessage(message));
            const summaries = nonReactionMessages.slice(0, MAX_HISTORY_MESSAGES).map(buildMessageSummary);
            const chatSummaries = chats.map(buildChatSummary);

            // Resolve Sync Type
            let syncTypeStr: string | null = null;
            if (payload.syncType !== null && payload.syncType !== undefined) {
                if (typeof payload.syncType === 'number') {
                    syncTypeStr = String(payload.syncType);
                } else {
                    syncTypeStr = String(payload.syncType);
                }
            }

            const syncPayload: SessionHistorySyncPayload = {
                syncType: syncTypeStr,
                progress: payload.progress ?? null,
                isLatest: payload.isLatest,
                chatsCount: chats.length,
                contactsCount: payload.contacts?.length ?? 0,
                messagesCount: nonReactionMessages.length,
                messagesTruncated: nonReactionMessages.length > summaries.length,
                messages: summaries,
                chats: chatSummaries,
            };

            void this.requestHandlers.onHistorySync(syncPayload);

            if (reactions.length) {
                const reactionsPayload: SessionMessagesReactionPayload = {
                    reactionsCount: reactions.length,
                    reactions,
                    source: 'history',
                };
                void this.requestHandlers.onMessagesReaction?.(reactionsPayload);
            }

            if (this.requestHandlers.onMessagesMedia) {
                // For history sync, we want to try downloading all media, not just 10.
                // We process them in background anyway.
                const mediaMessages = nonReactionMessages.filter(isMediaMessage);
                if (mediaMessages.length) {
                    void this.processMediaMessages({
                        socket,
                        messages: mediaMessages,
                        source: 'history',
                        onMessagesMedia: this.requestHandlers.onMessagesMedia,
                    });
                }
            }
        });
    }

    private handleMessagesUpsert(socket: WASocket): void {
        socket.ev.on('messages.upsert', (payload) => {
            if (!this.requestHandlers.onMessagesUpsert) {
                return;
            }

            const messages = payload.messages ?? [];
            const nonReactionMessages = messages.filter((message) => !isReactionMessage(message));
            const summaries = nonReactionMessages.slice(0, MAX_UPSERT_MESSAGES).map(buildMessageSummary);
            const upsertPayload: SessionMessagesUpsertPayload = {
                upsertType: payload.type,
                requestId: payload.requestId,
                messagesCount: nonReactionMessages.length,
                messages: summaries,
            };

            void this.requestHandlers.onMessagesUpsert(upsertPayload);

            if (this.requestHandlers.onMessagesMedia) {
                const mediaMessages = messages.filter(isMediaMessage);
                if (mediaMessages.length) {
                    void this.processMediaMessages({
                        socket,
                        messages: mediaMessages,
                        source: 'event',
                        onMessagesMedia: this.requestHandlers.onMessagesMedia,
                    });
                }
            }
        });
    }

    private handleMessagesUpdate(socket: WASocket): void {
        socket.ev.on('messages.update', (updates) => {
            if (!this.requestHandlers.onMessagesUpdate) {
                return;
            }
            const statusUpdates = updates
                .map((update) => buildMessageStatusUpdate(update.key, update.update))
                .filter(isStatusUpdate);
            if (statusUpdates.length) {
                const payload: SessionMessagesUpdatePayload = {
                    updatesCount: updates.length,
                    updates: statusUpdates,
                    source: 'update',
                };
                void this.requestHandlers.onMessagesUpdate(payload);
            }

            if (this.requestHandlers.onMessagesEdit) {
                const edits = updates
                    .map((update) => buildMessageEditUpdate(update.key, update.update))
                    .filter(isEditUpdate);
                if (edits.length) {
                    const payload: SessionMessagesEditPayload = {
                        editsCount: edits.length,
                        edits,
                    };
                    void this.requestHandlers.onMessagesEdit(payload);
                }
            }
        });
    }

    private handleMessageReceiptUpdate(socket: WASocket): void {
        socket.ev.on('message-receipt.update', (updates) => {
            if (!this.requestHandlers.onMessagesUpdate) {
                return;
            }
            const summaries = updates
                .map((update) => buildReceiptStatusUpdate(update.key, update.receipt))
                .filter(isStatusUpdate);
            if (!summaries.length) {
                return;
            }
            const payload: SessionMessagesUpdatePayload = {
                updatesCount: updates.length,
                updates: summaries,
                source: 'receipt',
            };
            void this.requestHandlers.onMessagesUpdate(payload);
        });
    }

    private handleMessagesDelete(socket: WASocket): void {
        socket.ev.on('messages.delete', (payload) => {
            if (!this.requestHandlers.onMessagesDelete) {
                return;
            }

            if ('keys' in payload) {
                const deletes = payload.keys
                    .map((key) => buildMessageDeleteUpdate(key))
                    .filter(isDeleteUpdate);
                if (!deletes.length) {
                    return;
                }
                const deletePayload: SessionMessagesDeletePayload = {
                    scope: 'message',
                    deletesCount: deletes.length,
                    deletes,
                };
                void this.requestHandlers.onMessagesDelete(deletePayload);
                return;
            }

            if (payload.all && payload.jid) {
                const deletePayload: SessionMessagesDeletePayload = {
                    scope: 'chat',
                    chatJid: payload.jid,
                    deletesCount: 0,
                    deletes: [],
                };
                void this.requestHandlers.onMessagesDelete(deletePayload);
            }
        });
    }

    private handleMessagesReaction(socket: WASocket): void {
        socket.ev.on('messages.reaction', (updates) => {
            if (!this.requestHandlers.onMessagesReaction) {
                return;
            }
            const reactions = updates
                .map((update) => buildReactionUpdateFromEvent(update, socket.user?.id ?? null))
                .filter(isReactionUpdate)
                .slice(0, MAX_REACTIONS);
            if (!reactions.length) {
                return;
            }
            const reactionsPayload: SessionMessagesReactionPayload = {
                reactionsCount: reactions.length,
                reactions,
                source: 'event',
            };
            void this.requestHandlers.onMessagesReaction(reactionsPayload);
        });
    }

    private async processMediaMessages(params: {
        socket: WASocket;
        messages: proto.IWebMessageInfo[];
        source: 'event' | 'history';
        onMessagesMedia: (payload: SessionMessagesMediaPayload) => Promise<void> | void;
    }): Promise<void> {
        if (!this.mediaStorage) {
            logger.warn('Media storage not configured; skipping media upload');
            return;
        }

        const mediaUpdates: SessionMessageMediaUpdate[] = [];

        // Use p-limit to control concurrency
        const promises = params.messages.map((message) => {
            return limit(async () => {
                const update = await this.uploadMediaMessage({
                    socket: params.socket,
                    message,
                });
                if (update) {
                    mediaUpdates.push(update);
                }
            });
        });

        await Promise.all(promises);

        if (!mediaUpdates.length) {
            return;
        }

        await params.onMessagesMedia({
            mediaCount: mediaUpdates.length,
            media: mediaUpdates,
            source: params.source,
        });
    }

    private async uploadMediaMessage(params: {
        socket: WASocket;
        message: proto.IWebMessageInfo;
    }): Promise<SessionMessageMediaUpdate | null> {
        if (!this.mediaStorage) {
            return null;
        }
        const meta = resolveMediaMeta(params.message);
        if (!meta) {
            return null;
        }

        if (meta.size && meta.size > MAX_MEDIA_BYTES) {
            logger.warn(
                { messageId: meta.messageId, size: meta.size },
                'Skipping media download: file too large'
            );
            return null;
        }

        try {
            // Unwrap message to ensure downloadMediaMessage can find the media content (e.g. inside templates)
            const unwrappedContent = unwrapMessage(params.message.message);
            const downloadPayload = {
                key: params.message.key,
                message: unwrappedContent
            };

            const buffer = await downloadMediaMessage(
                downloadPayload as any,
                'buffer',
                {},
                {
                    logger,
                    reuploadRequest: params.socket.updateMediaMessage,
                }
            );

            const fileName = meta.fileName ?? `${meta.messageId}.${resolveExtension(meta.mime)}`;
            const key = buildMediaKey({
                tenantId: this.tenantId,
                sessionId: this.sessionId,
                messageId: meta.messageId,
                fileName,
            });

            const result = await this.mediaStorage.uploadBuffer({
                key,
                body: buffer,
                contentType: meta.mime,
            });

            return {
                messageId: meta.messageId,
                chatJid: meta.chatJid,
                kind: meta.kind,
                mime: meta.mime,
                size: meta.size,
                fileName,
                url: result.url,
                sha256: meta.sha256,
                width: meta.width,
                height: meta.height,
                duration: meta.duration,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn({ err: message, messageId: meta.messageId }, 'Media download/upload failed');
            return null;
        }
    }
}
