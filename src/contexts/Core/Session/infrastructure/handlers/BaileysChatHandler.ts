import type { WASocket } from 'baileys';
import type {
    SessionProviderHandlers,
    SessionChatsUpsertPayload,
    SessionChatsUpdatePayload,
    SessionPresenceUpdatePayload
} from '@/contexts/Core/Session/application/SessionProvider';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import type { MediaStorage } from '@/contexts/Shared/domain/Storage/MediaStorage';
import { buildChatSummary, buildPresenceUpdates } from '../mappers/BaileysChatMapper';

export class BaileysChatHandler {
    constructor(
        private readonly sessionId: string,
        private readonly requestHandlers: SessionProviderHandlers,
        private readonly mediaStorage: MediaStorage | null
    ) { }

    handle(socket: WASocket): void {
        this.handleChatsUpsert(socket);
        this.handleChatsUpdate(socket);
        this.handleGroupsUpdate(socket);
        this.handlePresenceUpdate(socket);
        this.handleHistorySync(socket);
    }

    private handleHistorySync(socket: WASocket): void {
        socket.ev.on('messaging-history.set', (payload) => {
            const chats = payload.chats ?? [];
            if (!chats.length) return;

            const summaries = chats.map(buildChatSummary);
            // Background fetch for history items
            void this.fetchAndStoreChatIcons(socket, summaries)
                .then((icons) => this.emitUpdatedChatIcons(icons));
        });
    }

    private handleChatsUpsert(socket: WASocket): void {
        socket.ev.on('chats.upsert', (chats) => {
            if (!this.requestHandlers.onChatsUpsert) {
                return;
            }
            const summaries = chats.map(buildChatSummary);
            const payload: SessionChatsUpsertPayload = {
                chats: summaries,
                source: 'event',
            };
            void this.requestHandlers.onChatsUpsert(payload);

            // Background fetch for new items
            void this.fetchAndStoreChatIcons(socket, summaries)
                .then((icons) => this.emitUpdatedChatIcons(icons));
        });
    }

    private handleChatsUpdate(socket: WASocket): void {
        socket.ev.on('chats.update', (updates) => {
            if (!this.requestHandlers.onChatsUpdate) {
                return;
            }
            const chatUpdates = updates
                .filter((u): u is Partial<any> & { id: string } => !!u.id)
                .map((u) => ({
                    ...u,
                    unreadCount: u.unreadCount ?? undefined,
                    readOnly: u.readOnly ?? undefined,
                    participantCount: (u as any).participantCount ?? undefined,
                    createdAt: u.conversationTimestamp ? Number(u.conversationTimestamp) : undefined,
                    description: u.description ?? undefined,
                    name: u.name ?? undefined,
                    isGroup: u.id.endsWith('@g.us'),
                }));

            if (chatUpdates.length === 0) return;

            const payload: SessionChatsUpdatePayload = {
                chats: chatUpdates,
                source: 'event',
            };
            void this.requestHandlers.onChatsUpdate(payload);
        });
    }

    private handleGroupsUpdate(socket: WASocket): void {
        socket.ev.on('groups.update', (updates) => {
            if (!this.requestHandlers.onChatsUpdate) {
                return;
            }

            const chatUpdates = updates
                .filter(g => !!g.id)
                .map((g) => ({
                    id: g.id!,
                    name: g.subject,
                    participantCount: g.participants?.length,
                    createdAt: g.creation ? Number(g.creation) : undefined,
                    createdBy: g.owner,
                    description: g.desc,
                    isGroup: true,
                }));

            if (chatUpdates.length === 0) return;

            const payload: SessionChatsUpdatePayload = {
                chats: chatUpdates,
                source: 'event',
            };
            void this.requestHandlers.onChatsUpdate(payload);
        });
    }

    private handlePresenceUpdate(socket: WASocket): void {
        socket.ev.on('presence.update', (update) => {
            if (!this.requestHandlers.onPresenceUpdate) {
                return;
            }

            const updates = buildPresenceUpdates(update.presences);
            if (!updates.length) {
                return;
            }

            const payload: SessionPresenceUpdatePayload = {
                chatJid: update.id,
                updatesCount: updates.length,
                updates,
            };

            void this.requestHandlers.onPresenceUpdate(payload);
        });
    }
    private async fetchAndStoreChatIcons(
        socket: WASocket,
        chats: { id: string }[],
        maxConcurrent = 10
    ): Promise<Map<string, string>> {
        const icons = new Map<string, string>();
        const targets = chats.filter(c => c.id);

        if (targets.length === 0) {
            return icons;
        }

        logger.info(`Fetching and storing ${targets.length} chat/group icons to R2`);

        for (let i = 0; i < targets.length; i += maxConcurrent) {
            const batch = targets.slice(i, i + maxConcurrent);
            await Promise.allSettled(
                batch.map(async (chat) => {
                    try {
                        const jid = chat.id;
                        const whatsappUrl = await socket.profilePictureUrl(jid, 'image');
                        if (!whatsappUrl) return;

                        const response = await fetch(whatsappUrl);
                        if (!response.ok) return;

                        const imageBuffer = Buffer.from(await response.arrayBuffer());
                        const contentType = response.headers.get('content-type') || 'image/jpeg';

                        if (this.mediaStorage) {
                            const sanitizedJid = jid.replace(/[^a-zA-Z0-9]/g, '_');
                            const key = `profile-pictures/${sanitizedJid}.jpg`;
                            const result = await this.mediaStorage.uploadBuffer({
                                key,
                                body: imageBuffer,
                                contentType,
                            });
                            icons.set(jid, result.url);
                        } else {
                            icons.set(jid, whatsappUrl);
                        }
                    } catch (error) {
                        const msg = error instanceof Error ? error.message : 'unknown';
                        if (!msg.includes('404') && !msg.includes('401')) {
                            logger.debug({ jid: chat.id, error: msg }, 'Could not fetch/store chat icon');
                        }
                    }
                })
            );
            if (i + maxConcurrent < targets.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        return icons;
    }

    private emitUpdatedChatIcons(icons: Map<string, string>): void {
        if (icons.size === 0) return;

        const updatedContacts: any[] = [];
        for (const [jid, url] of icons.entries()) {
            updatedContacts.push({
                id: jid,
                imgUrl: url
            });
        }

        if (updatedContacts.length > 0 && this.requestHandlers.onContactsUpsert) {
            void this.requestHandlers.onContactsUpsert({
                contactsCount: updatedContacts.length,
                contactsTruncated: false,
                contacts: updatedContacts,
                source: 'event'
            });
        }
    }
}
