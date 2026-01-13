import type { SessionChatSummary, SessionPresenceUpdate } from '@/contexts/Core/Session/application/SessionProvider';

export const buildChatSummary = (chat: Partial<any>): SessionChatSummary => {
    return {
        id: chat.id || '',
        name: chat.name || chat.subject || null, // Handle both chat.name and group subject
        unreadCount: chat.unreadCount || 0,
        readOnly: chat.readOnly || false,
        isGroup: chat.id?.endsWith('@g.us') || false,
        participantCount: chat.participantCount || chat.participants?.length || null,
        createdAt: chat.conversationTimestamp ? Number(chat.conversationTimestamp) : (chat.creation || null),
        createdBy: chat.owner || null,
        description: chat.description || chat.desc || null,
    };
};

export const buildPresenceUpdates = (
    presences: Record<string, { lastKnownPresence?: string; lastSeen?: number }> | undefined
): SessionPresenceUpdate[] => {
    if (!presences) {
        return [];
    }

    return Object.entries(presences)
        .map(([jid, data]) => ({
            jid,
            presence: data.lastKnownPresence ?? 'unavailable',
            lastSeen: data.lastSeen ?? null,
        }))
        .filter((item) => Boolean(item.jid));
};
