import { create } from 'zustand';
import { toTimestamp } from '../../shared/utils/date';

const normalizeChat = (item) => ({
  chatJid: item.chatJid,
  chatName: item.chatName ?? null,
  lastMessageId: item.lastMessageId ?? null,
  lastMessageType: item.lastMessageType ?? null,
  lastMessageText: item.lastMessageText ?? null,
  lastMessageTs: toTimestamp(item.lastMessageTs ?? item.lastMessageTsString ?? item.lastMessageTsRaw ?? null),
  unreadCount: item.unreadCount ?? 0,
});

const useChatStore = create((set) => ({
  chats: [],
  selectedChatJid: null,
  setChats: (items) => {
    const next = items.map(normalizeChat);
    next.sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));
    set({ chats: next });
  },
  updateChatFromMessage: ({ chatJid, message }) =>
    set((state) => {
      if (!chatJid) {
        return state;
      }
      const next = [...state.chats];
      const index = next.findIndex((chat) => chat.chatJid === chatJid);
      const messageTs = toTimestamp(message.timestamp ?? message.statusAt ?? null);
      const messageText = message.text || (message.type ? `[${message.type}]` : '');
      const unreadDelta = message.upsertType === 'notify' && !message.fromMe && state.selectedChatJid !== chatJid ? 1 : 0;

      if (index >= 0) {
        const chat = next[index];
        next[index] = {
          ...chat,
          lastMessageId: message.id ?? chat.lastMessageId,
          lastMessageTs: messageTs ?? chat.lastMessageTs,
          lastMessageText: messageText ?? chat.lastMessageText,
          lastMessageType: message.type ?? chat.lastMessageType,
          unreadCount: (chat.unreadCount || 0) + unreadDelta,
        };
      } else {
        next.push({
          chatJid,
          chatName: null,
          lastMessageId: message.id ?? null,
          lastMessageTs: messageTs,
          lastMessageText: messageText || null,
          lastMessageType: message.type ?? null,
          unreadCount: unreadDelta,
        });
      }

      next.sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));
      return { chats: next };
    }),
  selectChat: (chatJid) =>
    set((state) => ({
      selectedChatJid: chatJid,
      chats: state.chats.map((chat) =>
        chat.chatJid === chatJid ? { ...chat, unreadCount: 0 } : chat
      ),
    })),
  setSelectedChatJid: (chatJid) => set({ selectedChatJid: chatJid }),
  applyChatNames: (nameMap) =>
    set((state) => ({
      chats: state.chats.map((chat) => ({
        ...chat,
        chatName: nameMap[chat.chatJid] ?? chat.chatName,
      })),
    })),
}));

export default useChatStore;
