import { create } from 'zustand';
import { toTimestamp } from '../../shared/utils/date';

const normalizeReactions = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  if (items.some((item) => Array.isArray(item.actors))) {
    return items
      .filter((item) => item && item.emoji)
      .map((item) => ({
        emoji: item.emoji,
        count: item.count ?? (Array.isArray(item.actors) ? item.actors.length : 0),
        actors: Array.isArray(item.actors) ? item.actors : [],
      }));
  }

  const grouped = new Map();
  for (const item of items) {
    if (!item || !item.emoji || item.removed) {
      continue;
    }
    const entry = grouped.get(item.emoji) || { emoji: item.emoji, count: 0, actors: [] };
    if (item.actorJid && !entry.actors.includes(item.actorJid)) {
      entry.actors.push(item.actorJid);
    }
    entry.count = entry.actors.length;
    grouped.set(item.emoji, entry);
  }
  return Array.from(grouped.values());
};

const unwrapMessageContent = (message) => {
  if (!message || typeof message !== 'object') {
    return null;
  }
  return (
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.editedMessage?.message ||
    message.documentWithCaptionMessage?.message ||
    message
  );
};

const extractContextInfo = (raw) => {
  const message = raw?.message;
  if (!message || typeof message !== 'object') {
    return null;
  }

  const content = unwrapMessageContent(message);
  if (!content || typeof content !== 'object') {
    return null;
  }

  return (
    content.contextInfo ||
    content.extendedTextMessage?.contextInfo ||
    content.imageMessage?.contextInfo ||
    content.videoMessage?.contextInfo ||
    content.documentMessage?.contextInfo ||
    content.audioMessage?.contextInfo ||
    content.stickerMessage?.contextInfo ||
    null
  );
};

const extractMentionJids = (raw) => {
  const contextInfo = extractContextInfo(raw);
  const mentioned = contextInfo?.mentionedJid;
  if (!Array.isArray(mentioned)) {
    return [];
  }
  const filtered = mentioned.filter((jid) => typeof jid === 'string' && jid.trim());
  return [...new Set(filtered)];
};

const normalizeMentions = (item) => {
  if (Array.isArray(item?.mentions)) {
    return item.mentions
      .map((mention) => {
        if (!mention) return null;
        if (typeof mention === 'string') {
          return { jid: mention, name: null };
        }
        if (typeof mention === 'object') {
          const jid = mention.jid || mention.id || mention.contactJid;
          if (!jid) return null;
          return { jid, name: mention.name ?? null };
        }
        return null;
      })
      .filter(Boolean);
  }

  const mentionJids = extractMentionJids(item?.raw);
  return mentionJids.map((jid) => ({ jid, name: null }));
};

const normalizeMessage = (item, fallbackChatJid) => {
  const timestamp = toTimestamp(item.timestamp ?? item.timestampMs ?? item.timestampTs ?? null);
  const statusAt = toTimestamp(item.statusAt ?? null);
  const editedAt = toTimestamp(item.editedAt ?? null);
  const deletedAt = toTimestamp(item.deletedAt ?? null);
  const chatJid = item.chatJid ?? item.remoteJid ?? fallbackChatJid ?? null;

  const media = Array.isArray(item.media) ? item.media[0] : item.media;

  return {
    id: item.id,
    chatJid,
    fromMe: Boolean(item.fromMe),
    senderJid: item.senderJid ?? null,
    timestamp,
    type: item.type ?? null,
    text: item.text ?? null,
    status: item.status ?? null,
    statusAt,
    isEdited: Boolean(item.isEdited),
    editedAt,
    isDeleted: Boolean(item.isDeleted),
    deletedAt,
    reactions: normalizeReactions(item.reactions),
    media: media ?? null,
    replyTo: item.replyTo ?? null,
    forward: item.forward ?? null,
    mentions: normalizeMentions(item),
  };
};

const sortOrder = (order, byId) =>
  [...order].sort((a, b) => {
    const aTs = byId[a]?.timestamp ?? 0;
    const bTs = byId[b]?.timestamp ?? 0;
    return aTs - bTs;
  });

const applyReactionUpdate = (reactions, reaction) => {
  if (!reaction?.emoji) {
    return reactions;
  }
  const next = reactions.map((entry) => ({
    ...entry,
    actors: [...entry.actors],
  }));
  const index = next.findIndex((entry) => entry.emoji === reaction.emoji);
  if (index === -1 && !reaction.removed) {
    const actors = reaction.actorJid ? [reaction.actorJid] : [];
    return [...next, { emoji: reaction.emoji, count: actors.length, actors }];
  }
  if (index === -1) {
    return next;
  }

  const entry = next[index];
  if (reaction.removed) {
    entry.actors = entry.actors.filter((jid) => jid !== reaction.actorJid);
  } else if (reaction.actorJid && !entry.actors.includes(reaction.actorJid)) {
    entry.actors.push(reaction.actorJid);
  }
  entry.count = entry.actors.length;

  return next.filter((item) => item.count > 0);
};

const cloneChatBucket = (bucket) => ({
  order: [...bucket.order],
  byId: { ...bucket.byId },
});

const useMessageStore = create((set) => ({
  messagesByChat: {},
  messageToChat: {},
  draftsByChat: {},
  setDraft: (chatJid, value) =>
    set((state) => ({
      draftsByChat: { ...state.draftsByChat, [chatJid]: value },
    })),
  clearDraft: (chatJid) =>
    set((state) => {
      const next = { ...state.draftsByChat };
      delete next[chatJid];
      return { draftsByChat: next };
    }),
  setMessagesForChat: (chatJid, items) =>
    set((state) => {
      const byId = {};
      const order = [];
      const nextMessageToChat = { ...state.messageToChat };
      for (const item of items) {
        if (!item?.id) continue;
        const message = normalizeMessage(item, chatJid);
        byId[message.id] = message;
        order.push(message.id);
        if (message.chatJid) {
          nextMessageToChat[message.id] = message.chatJid;
        }
      }
      const nextMessagesByChat = {
        ...state.messagesByChat,
        [chatJid]: {
          byId,
          order: sortOrder(order, byId),
        },
      };
      return { messagesByChat: nextMessagesByChat, messageToChat: nextMessageToChat };
    }),
  upsertMessages: (items) =>
    set((state) => {
      let nextMessagesByChat = { ...state.messagesByChat };
      let nextMessageToChat = { ...state.messageToChat };

      for (const item of items) {
        if (!item?.id) continue;
        const message = normalizeMessage(item, item.chatJid ?? item.remoteJid ?? null);
        if (!message.chatJid) continue;

        const existingBucket = nextMessagesByChat[message.chatJid] || { order: [], byId: {} };
        const bucket = cloneChatBucket(existingBucket);
        const existing = bucket.byId[message.id];

        bucket.byId[message.id] = {
          ...existing,
          ...message,
          reactions: message.reactions.length ? message.reactions : existing?.reactions ?? [],
          media: message.media ?? existing?.media ?? null,
          replyTo: message.replyTo ?? existing?.replyTo ?? null,
          forward: message.forward ?? existing?.forward ?? null,
          mentions: message.mentions.length ? message.mentions : existing?.mentions ?? [],
        };
        if (!existing) {
          bucket.order.push(message.id);
        }
        bucket.order = sortOrder(bucket.order, bucket.byId);
        nextMessagesByChat = { ...nextMessagesByChat, [message.chatJid]: bucket };
        nextMessageToChat = { ...nextMessageToChat, [message.id]: message.chatJid };
      }

      return { messagesByChat: nextMessagesByChat, messageToChat: nextMessageToChat };
    }),
  applyStatusUpdates: (updates) =>
    set((state) => {
      let nextMessagesByChat = { ...state.messagesByChat };
      for (const update of updates) {
        const chatJid = state.messageToChat[update.messageId];
        if (!chatJid) continue;
        const bucket = nextMessagesByChat[chatJid];
        if (!bucket?.byId?.[update.messageId]) continue;

        const nextBucket = cloneChatBucket(bucket);
        const message = { ...nextBucket.byId[update.messageId] };
        message.status = update.status ?? message.status;
        message.statusAt = toTimestamp(update.statusAt ?? message.statusAt);
        nextBucket.byId[update.messageId] = message;
        nextMessagesByChat = { ...nextMessagesByChat, [chatJid]: nextBucket };
      }
      return { messagesByChat: nextMessagesByChat };
    }),
  applyEdits: (edits) =>
    set((state) => {
      let nextMessagesByChat = { ...state.messagesByChat };
      for (const edit of edits) {
        const chatJid = state.messageToChat[edit.messageId];
        if (!chatJid) continue;
        const bucket = nextMessagesByChat[chatJid];
        if (!bucket?.byId?.[edit.messageId]) continue;

        const nextBucket = cloneChatBucket(bucket);
        const message = { ...nextBucket.byId[edit.messageId] };
        if (edit.text !== null && edit.text !== undefined) {
          message.text = edit.text;
        }
        if (edit.type) {
          message.type = edit.type;
        }
        message.isEdited = true;
        message.editedAt = toTimestamp(edit.editedAt ?? message.editedAt);
        nextBucket.byId[edit.messageId] = message;
        nextMessagesByChat = { ...nextMessagesByChat, [chatJid]: nextBucket };
      }
      return { messagesByChat: nextMessagesByChat };
    }),
  applyDeletes: (payload) =>
    set((state) => {
      let nextMessagesByChat = { ...state.messagesByChat };

      if (payload.scope === 'chat' && payload.chatJid) {
        const bucket = nextMessagesByChat[payload.chatJid];
        if (!bucket) return state;
        const nextBucket = cloneChatBucket(bucket);
        for (const messageId of nextBucket.order) {
          const message = { ...nextBucket.byId[messageId] };
          message.isDeleted = true;
          message.text = 'Mensaje eliminado';
          message.deletedAt = toTimestamp(payload.deletedAt ?? message.deletedAt);
          nextBucket.byId[messageId] = message;
        }
        nextMessagesByChat = { ...nextMessagesByChat, [payload.chatJid]: nextBucket };
        return { messagesByChat: nextMessagesByChat };
      }

      for (const deletion of payload.deletes || []) {
        const chatJid = state.messageToChat[deletion.messageId];
        if (!chatJid) continue;
        const bucket = nextMessagesByChat[chatJid];
        if (!bucket?.byId?.[deletion.messageId]) continue;
        const nextBucket = cloneChatBucket(bucket);
        const message = { ...nextBucket.byId[deletion.messageId] };
        message.isDeleted = true;
        message.text = 'Mensaje eliminado';
        message.deletedAt = toTimestamp(deletion.deletedAt ?? message.deletedAt);
        nextBucket.byId[deletion.messageId] = message;
        nextMessagesByChat = { ...nextMessagesByChat, [chatJid]: nextBucket };
      }

      return { messagesByChat: nextMessagesByChat };
    }),
  applyReactions: (reactions) =>
    set((state) => {
      let nextMessagesByChat = { ...state.messagesByChat };

      for (const reaction of reactions || []) {
        const chatJid =
          state.messageToChat[reaction.messageId] || reaction.chatJid || null;
        if (!chatJid) continue;
        const bucket = nextMessagesByChat[chatJid];
        if (!bucket?.byId?.[reaction.messageId]) continue;

        const nextBucket = cloneChatBucket(bucket);
        const message = { ...nextBucket.byId[reaction.messageId] };
        message.reactions = applyReactionUpdate(message.reactions || [], reaction);
        nextBucket.byId[reaction.messageId] = message;
        nextMessagesByChat = { ...nextMessagesByChat, [chatJid]: nextBucket };
      }

      return { messagesByChat: nextMessagesByChat };
    }),
  applyMedia: (items) =>
    set((state) => {
      let nextMessagesByChat = { ...state.messagesByChat };

      for (const media of items || []) {
        const chatJid = state.messageToChat[media.messageId] || media.chatJid || null;
        if (!chatJid) continue;
        const bucket = nextMessagesByChat[chatJid];
        if (!bucket?.byId?.[media.messageId]) continue;

        const nextBucket = cloneChatBucket(bucket);
        const message = { ...nextBucket.byId[media.messageId] };
        message.media = {
          kind: media.kind,
          url: media.url,
          mime: media.mime,
          size: media.size,
          fileName: media.fileName,
          width: media.width,
          height: media.height,
          duration: media.duration,
        };
        nextBucket.byId[media.messageId] = message;
        nextMessagesByChat = { ...nextMessagesByChat, [chatJid]: nextBucket };
      }

      return { messagesByChat: nextMessagesByChat };
    }),
}));

export default useMessageStore;
