import type { WASocket } from 'baileys';
import type {
    SessionProviderHandlers,
    SessionContactsUpsertPayload,
    SessionContactSummary
} from '@/contexts/Core/Session/application/SessionProvider';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import type { MediaStorage } from '@/contexts/Shared/domain/Storage/MediaStorage';
import { buildContactSummary, isContactSummary } from '../mappers/BaileysContactMapper';

const MAX_CONTACTS = 2000;

export class BaileysContactHandler {
    constructor(
        private readonly sessionId: string,
        private readonly requestHandlers: SessionProviderHandlers,
        private readonly mediaStorage: MediaStorage | null
    ) { }

    handle(socket: WASocket): void {
        this.handleContactsUpsert(socket);
        this.handleContactsUpdate(socket);
        this.handleHistorySync(socket);
    }

    private handleHistorySync(socket: WASocket): void {
        socket.ev.on('messaging-history.set', (payload) => {
            const contacts = payload.contacts ?? [];
            if (!contacts.length || !this.requestHandlers.onContactsUpsert) {
                return;
            }

            const summaries = contacts
                .slice(0, MAX_CONTACTS) // Respect the limit even for history
                .map(buildContactSummary)
                .filter(isContactSummary);

            if (!summaries.length) {
                return;
            }

            const contactsPayload: SessionContactsUpsertPayload = {
                contactsCount: contacts.length,
                contactsTruncated: contacts.length > summaries.length,
                contacts: summaries,
                source: 'history',
            };
            void this.requestHandlers.onContactsUpsert(contactsPayload);

            void this.fetchAndStoreProfilePictures(socket, summaries)
                .then((profilePictures) => this.emitUpdatedContacts(profilePictures, summaries));
        });
    }

    private handleContactsUpsert(socket: WASocket): void {
        socket.ev.on('contacts.upsert', async (contacts) => {
            if (!this.requestHandlers.onContactsUpsert) {
                return;
            }
            const summaries = contacts
                .slice(0, MAX_CONTACTS)
                .map(buildContactSummary)
                .filter(isContactSummary);

            const contactsPayload: SessionContactsUpsertPayload = {
                contactsCount: contacts.length,
                contactsTruncated: contacts.length > summaries.length,
                contacts: summaries,
                source: 'event',
            };
            void this.requestHandlers.onContactsUpsert(contactsPayload);

            void this.fetchAndStoreProfilePictures(socket, summaries)
                .then((profilePictures) => this.emitUpdatedContacts(profilePictures, summaries));
        });
    }

    private handleContactsUpdate(socket: WASocket): void {
        socket.ev.on('contacts.update', async (contacts) => {
            if (!this.requestHandlers.onContactsUpsert) {
                return;
            }
            const summaries = contacts
                .slice(0, MAX_CONTACTS)
                .map(buildContactSummary)
                .filter(isContactSummary);

            const contactsPayload: SessionContactsUpsertPayload = {
                contactsCount: contacts.length,
                contactsTruncated: contacts.length > summaries.length,
                contacts: summaries,
                source: 'event',
            };
            void this.requestHandlers.onContactsUpsert(contactsPayload);

            void this.fetchAndStoreProfilePictures(socket, summaries)
                .then((profilePictures) => this.emitUpdatedContacts(profilePictures, summaries));
        });
    }

    private async fetchAndStoreProfilePictures(
        socket: WASocket,
        contacts: SessionContactSummary[],
        maxConcurrent = 10
    ): Promise<Map<string, string>> {
        const profilePictures = new Map<string, string>();
        const contactsNeedingPics = contacts.filter(c => !c.imgUrl && c.id);

        if (contactsNeedingPics.length === 0) {
            return profilePictures;
        }

        logger.info(`Fetching and storing ${contactsNeedingPics.length} profile pictures to R2`);

        for (let i = 0; i < contactsNeedingPics.length; i += maxConcurrent) {
            const batch = contactsNeedingPics.slice(i, i + maxConcurrent);
            await Promise.allSettled(
                batch.map(async (contact) => {
                    try {
                        const jid = contact.id;
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
                            profilePictures.set(jid, result.url);
                        } else {
                            profilePictures.set(jid, whatsappUrl);
                        }
                    } catch (error) {
                        logger.debug({ jid: contact.id, error: error instanceof Error ? error.message : 'unknown' }, 'Could not fetch/store profile picture');
                    }
                })
            );
            if (i + maxConcurrent < contactsNeedingPics.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        return profilePictures;
    }

    private emitUpdatedContacts(profilePictures: Map<string, string>, summaries: SessionContactSummary[]): void {
        if (profilePictures.size === 0) return;
        const updated: SessionContactSummary[] = [];
        for (const c of summaries) {
            const imgUrl = profilePictures.get(c.id);
            if (imgUrl) {
                updated.push({ ...c, imgUrl });
            }
        }
        if (updated.length > 0) {
            void this.requestHandlers.onContactsUpsert?.({
                contactsCount: updated.length,
                contactsTruncated: false,
                contacts: updated,
                source: 'event',
            });
        }
    }
}
