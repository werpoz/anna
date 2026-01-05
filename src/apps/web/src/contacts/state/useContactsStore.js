import { create } from 'zustand';

const pickName = (contact) =>
  contact.name || contact.notify || contact.verifiedName || contact.phoneNumber || null;

const mapContacts = (items) => {
  const map = {};
  for (const contact of items) {
    if (!contact) continue;
    if (contact.contactJid) {
      map[contact.contactJid] = contact;
    }
    if (contact.contactLid) {
      map[contact.contactLid] = contact;
    }
  }
  return map;
};

const useContactsStore = create((set, get) => ({
  contactsByJid: {},
  setContacts: (items) => set({ contactsByJid: mapContacts(items) }),
  upsertContacts: (items) =>
    set((state) => ({
      contactsByJid: { ...state.contactsByJid, ...mapContacts(items) },
    })),
  resolveName: (jid) => {
    if (!jid) return null;
    const contact = get().contactsByJid[jid];
    return contact ? pickName(contact) : null;
  },
}));

export default useContactsStore;
