import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ChatControllerDeps } from '@/apps/api/controllers/chats/types';
import { requireAuth } from '@/apps/api/middleware/requireAuth';
import { resolveSessionIdForTenant } from '@/apps/api/controllers/chats/helpers';

const isPreferredChatJid = (value: string | null): boolean =>
  Boolean(value && (value.endsWith('@s.whatsapp.net') || value.endsWith('@g.us')));

const resolveContactName = (params: {
  name?: string | null;
  notify?: string | null;
  verifiedName?: string | null;
  phoneNumber?: string | null;
}): string | null =>
  params.name ?? params.notify ?? params.verifiedName ?? params.phoneNumber ?? null;

export const registerListChatsRoute = (app: Hono<AppEnv>, deps: ChatControllerDeps): void => {
  app.get('/chats', requireAuth, async (c) => {
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

    const items = await deps.chatRepository.listByTenant(auth.userId, resolvedSessionId);
    const contacts = await deps.contactRepository.listByTenant(auth.userId, resolvedSessionId);
    const contactNames = new Map<string, string>();
    for (const contact of contacts) {
      const displayName = resolveContactName({
        name: contact.name,
        notify: contact.notify,
        verifiedName: contact.verifiedName,
        phoneNumber: contact.phoneNumber,
      });
      if (!displayName) {
        continue;
      }
      contactNames.set(contact.contactJid, displayName);
      if (contact.contactLid) {
        contactNames.set(contact.contactLid, displayName);
      }
    }
    const aliases = Array.from(new Set(items.map((item) => item.chatJid)));
    const aliasMap = await deps.chatAliasRepository.resolveMany({
      sessionId: resolvedSessionId,
      aliases,
    });

    const grouped = new Map<string, (typeof items)[number]>();
    for (const item of items) {
      const key = aliasMap.get(item.chatJid) ?? item.chatJid;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { ...item });
        continue;
      }

      const existingPreferred = isPreferredChatJid(existing.chatJid);
      const nextPreferred = isPreferredChatJid(item.chatJid);
      if (!existingPreferred && nextPreferred) {
        existing.chatJid = item.chatJid;
      }

      if (!existing.chatName && item.chatName) {
        existing.chatName = item.chatName;
      }

      if (
        item.lastMessageTs &&
        (!existing.lastMessageTs || item.lastMessageTs > existing.lastMessageTs)
      ) {
        existing.lastMessageId = item.lastMessageId;
        existing.lastMessageTs = item.lastMessageTs;
        existing.lastMessageText = item.lastMessageText;
        existing.lastMessageType = item.lastMessageType;
      }

      existing.unreadCount += item.unreadCount;
    }

    const merged = Array.from(grouped.values()).sort((a, b) => {
      if (!a.lastMessageTs && !b.lastMessageTs) {
        return 0;
      }
      if (!a.lastMessageTs) {
        return 1;
      }
      if (!b.lastMessageTs) {
        return -1;
      }
      return b.lastMessageTs.getTime() - a.lastMessageTs.getTime();
    });

    for (const item of merged) {
      const contactName = contactNames.get(item.chatJid);
      if (contactName) {
        item.chatName = contactName;
      }
    }

    return c.json({ sessionId: resolvedSessionId, items: merged }, 200);
  });
};
