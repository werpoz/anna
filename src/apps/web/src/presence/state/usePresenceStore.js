import { create } from 'zustand';
import { toTimestamp } from '../../shared/utils/date';

const usePresenceStore = create((set) => ({
  presenceByChat: {},
  updatePresence: (chatJid, updates) => {
    if (!chatJid) return;
    const summary = Array.isArray(updates)
      ? updates.find((u) => u.presence === 'composing')?.presence ||
        updates.find((u) => u.presence === 'recording')?.presence ||
        updates.find((u) => u.presence === 'available')?.presence ||
        updates[0]?.presence ||
        null
      : null;
    const lastSeen = Array.isArray(updates)
      ? updates.map((u) => toTimestamp(u.lastSeen)).find(Boolean) || null
      : null;

    set((state) => ({
      presenceByChat: {
        ...state.presenceByChat,
        [chatJid]: {
          presence: summary,
          lastSeen,
        },
      },
    }));
  },
}));

export default usePresenceStore;
