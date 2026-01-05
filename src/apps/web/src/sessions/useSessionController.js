import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import QRCode from 'qrcode';
import useAuthStore from '../auth/state/useAuthStore';
import * as sessionsApi from './api/sessionsApi';
import * as chatsApi from '../chats/api/chatsApi';
import * as contactsApi from '../contacts/api/contactsApi';
import useSessionStore from './state/useSessionStore';
import useChatStore from '../chats/state/useChatStore';
import useMessageStore from '../messages/state/useMessageStore';
import useContactsStore from '../contacts/state/useContactsStore';
import usePresenceStore from '../presence/state/usePresenceStore';
import { API_BASE_URL } from '../shared/config';
import { toWsUrl } from '../shared/ws';

const buildNameMap = (contacts) => {
  const map = {};
  for (const contact of contacts) {
    const name = contact.name || contact.notify || contact.verifiedName || contact.phoneNumber;
    if (!name) continue;
    if (contact.contactJid) {
      map[contact.contactJid] = name;
    }
    if (contact.contactLid) {
      map[contact.contactLid] = name;
    }
  }
  return map;
};

const useSessionController = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refresh = useAuthStore((state) => state.refresh);

  const sessionState = useSessionStore(
    useShallow((state) => ({
      sessionId: state.sessionId,
      wsStatus: state.wsStatus,
      wsLive: state.wsLive,
      sessionStatus: state.sessionStatus,
      sessionLive: state.sessionLive,
      historyStatus: state.historyStatus,
      historyLive: state.historyLive,
      qr: state.qr,
      qrImage: state.qrImage,
      qrExpires: state.qrExpires,
      hasRequestedSession: state.hasRequestedSession,
    }))
  );

  const {
    setSessionId,
    setWsState,
    setSessionState,
    setHistoryState,
    setQrState,
    setHasRequestedSession,
  } = useSessionStore(
    useShallow((state) => ({
      setSessionId: state.setSessionId,
      setWsState: state.setWsState,
      setSessionState: state.setSessionState,
      setHistoryState: state.setHistoryState,
      setQrState: state.setQrState,
      setHasRequestedSession: state.setHasRequestedSession,
    }))
  );

  const { chats, selectedChatJid } = useChatStore(
    useShallow((state) => ({
      chats: state.chats,
      selectedChatJid: state.selectedChatJid,
    }))
  );

  const { setChats, updateChatFromMessage, selectChat } = useChatStore(
    useShallow((state) => ({
      setChats: state.setChats,
      updateChatFromMessage: state.updateChatFromMessage,
      selectChat: state.selectChat,
    }))
  );

  const {
    setMessagesForChat,
    upsertMessages,
    applyStatusUpdates,
    applyEdits,
    applyDeletes,
    applyReactions,
    applyMedia,
    setDraft,
    clearDraft,
    messagesByChat,
    draftsByChat,
  } = useMessageStore(
    useShallow((state) => ({
      setMessagesForChat: state.setMessagesForChat,
      upsertMessages: state.upsertMessages,
      applyStatusUpdates: state.applyStatusUpdates,
      applyEdits: state.applyEdits,
      applyDeletes: state.applyDeletes,
      applyReactions: state.applyReactions,
      applyMedia: state.applyMedia,
      setDraft: state.setDraft,
      clearDraft: state.clearDraft,
      messagesByChat: state.messagesByChat,
      draftsByChat: state.draftsByChat,
    }))
  );

  const { setContacts, upsertContacts } = useContactsStore(
    useShallow((state) => ({
      setContacts: state.setContacts,
      upsertContacts: state.upsertContacts,
    }))
  );

  const { updatePresence } = usePresenceStore(
    useShallow((state) => ({
      updatePresence: state.updatePresence,
    }))
  );

  const wsRef = useRef(null);
  const wsHeartbeatRef = useRef(null);
  const wsReconnectRef = useRef({ timer: null, attempts: 0, manualClose: false });
  const qrVersionRef = useRef(0);

  const buildQrDataUrl = async (value) => {
    return await QRCode.toDataURL(value, { margin: 1, width: 240 });
  };

  const ensureToken = () => {
    if (!accessToken?.trim()) {
      alert('Access token is required');
      return null;
    }
    return accessToken.trim();
  };

  const clearWsTimers = () => {
    if (wsHeartbeatRef.current) {
      clearInterval(wsHeartbeatRef.current);
      wsHeartbeatRef.current = null;
    }
    if (wsReconnectRef.current.timer) {
      clearTimeout(wsReconnectRef.current.timer);
      wsReconnectRef.current.timer = null;
    }
  };

  const scheduleReconnect = async () => {
    if (wsReconnectRef.current.manualClose) {
      return;
    }

    wsReconnectRef.current.attempts += 1;
    const delayMs = Math.min(1000 * 2 ** (wsReconnectRef.current.attempts - 1), 15000);
    setWsState(`ws: reconnecting in ${Math.round(delayMs / 1000)}s`, false);
    wsReconnectRef.current.timer = setTimeout(async () => {
      wsReconnectRef.current.timer = null;
      await refresh();
      await connectWs();
    }, delayMs);
  };

  const startHeartbeat = () => {
    if (wsHeartbeatRef.current) {
      clearInterval(wsHeartbeatRef.current);
    }
    wsHeartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('__ping__');
      }
    }, 20000);
  };

  const loadContacts = async (token, sessionIdValue) => {
    try {
      const contactsPayload = await contactsApi.listContacts(token, sessionIdValue);
      const items = Array.isArray(contactsPayload?.items) ? contactsPayload.items : [];
      setContacts(items);
      const nameMap = buildNameMap(items);
      useChatStore.getState().applyChatNames(nameMap);
    } catch {
      // ignore contacts load errors
    }
  };

  const loadChats = async ({ sessionIdOverride, skipFallback } = {}) => {
    const token = ensureToken();
    if (!token) return;

    const resolvedSessionId = sessionIdOverride ?? useSessionStore.getState().sessionId;
    let payload;
    try {
      payload = await chatsApi.listChats(token, resolvedSessionId);
    } catch {
      return;
    }

    if (payload?.sessionId) {
      setSessionId(payload.sessionId);
    } else if (resolvedSessionId && !skipFallback) {
      setSessionId('');
      await loadChats({ sessionIdOverride: '', skipFallback: true });
      return;
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    setChats(items);

    if (!useChatStore.getState().selectedChatJid && items.length) {
      selectChat(items[0].chatJid);
      await loadMessages(items[0].chatJid);
    }

    await loadContacts(token, payload?.sessionId ?? resolvedSessionId);
  };

  const loadMessages = async (chatJid) => {
    const token = ensureToken();
    if (!token) return;
    const sessionIdValue = useSessionStore.getState().sessionId;
    try {
      const payload = await chatsApi.listMessages(token, chatJid, sessionIdValue);
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setMessagesForChat(chatJid, items);
    } catch {
      // ignore messages load errors
    }
  };

  const markChatRead = async (chatJid) => {
    const token = ensureToken();
    if (!token) return;
    const bucket = useMessageStore.getState().messagesByChat[chatJid];
    if (!bucket) return;
    const unread = bucket.order
      .map((id) => bucket.byId[id])
      .filter((msg) => msg && !msg.fromMe && msg.status !== 'read')
      .map((msg) => msg.id);

    if (!unread.length) {
      return;
    }
    try {
      await chatsApi.markRead(token, chatJid, unread);
    } catch {
      // ignore read errors
    }
  };

  const selectChatAndLoad = async (chat) => {
    selectChat(chat.chatJid);
    await loadMessages(chat.chatJid);
    await markChatRead(chat.chatJid);
  };

  const connectWs = async () => {
    const authToken = ensureToken();
    if (!authToken) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    wsReconnectRef.current.manualClose = false;
    clearWsTimers();
    const socket = new WebSocket(toWsUrl(API_BASE_URL, authToken));
    wsRef.current = socket;

    socket.addEventListener('open', () => {
      setWsState('ws: connected', true);
      wsReconnectRef.current.attempts = 0;
      startHeartbeat();
    });

    socket.addEventListener('close', (event) => {
      setWsState(`ws: closed (${event.code})`, false);
      clearWsTimers();
      void scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      setWsState('ws: error', false);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'session.qr.updated') {
          setQrState({ qr: data.payload.qr, qrExpires: `expires: ${data.payload.expiresAt}` });
          setSessionState('session: pending_qr', true);
          const version = ++qrVersionRef.current;
          buildQrDataUrl(data.payload.qr)
            .then((url) => {
              if (qrVersionRef.current === version) {
                setQrState({ qrImage: url });
              }
            })
            .catch(() => {
              if (qrVersionRef.current === version) {
                setQrState({ qrImage: '' });
              }
            });
        }

        if (data.type === 'session.snapshot') {
          const snapshot = data.payload?.session;
          if (!snapshot) {
            setSessionState('session: idle', false);
          } else {
            setSessionId(snapshot.id);
            setHasRequestedSession(true);
            if (snapshot.status === 'connected') {
              setSessionState('session: connected', true);
              void loadChats({ sessionIdOverride: snapshot.id });
            } else if (snapshot.status === 'pending_qr') {
              setSessionState('session: pending_qr', true);
              if (snapshot.qr) {
                setQrState({
                  qr: snapshot.qr,
                  qrExpires: `expires: ${snapshot.qrExpiresAt ?? '-'}`,
                });
                const version = ++qrVersionRef.current;
                buildQrDataUrl(snapshot.qr)
                  .then((url) => {
                    if (qrVersionRef.current === version) {
                      setQrState({ qrImage: url });
                    }
                  })
                  .catch(() => {
                    if (qrVersionRef.current === version) {
                      setQrState({ qrImage: '' });
                    }
                  });
              }
            } else if (snapshot.status === 'disconnected') {
              setSessionState('session: disconnected', false);
            }
          }
        }

        if (data.type === 'session.status.connected') {
          setSessionState('session: connected', true);
          setHasRequestedSession(true);
          void loadChats();
        }

        if (data.type === 'session.status.disconnected') {
          setSessionState('session: disconnected', false);
        }

        if (data.type === 'session.history.sync') {
          const payload = data.payload || {};
          const progress =
            typeof payload.progress === 'number' && !Number.isNaN(payload.progress)
              ? Math.max(0, Math.min(100, Math.round(payload.progress)))
              : null;
          const isLatest = Boolean(payload.isLatest);
          const label = progress !== null ? `${progress}%` : 'syncing';
          const suffix = isLatest ? 'complete' : 'syncing';
          setHistoryState(`history: ${label} (${suffix})`, !isLatest);
          const historyMessages = Array.isArray(payload.messages) ? payload.messages : [];
          if (historyMessages.length) {
            upsertMessages(historyMessages);
            historyMessages.forEach((msg) => {
              updateChatFromMessage({ chatJid: msg.remoteJid, message: { ...msg, upsertType: 'history' } });
            });
          }
          if (isLatest) {
            void loadChats();
          }
        }

        if (data.type === 'session.messages.upsert') {
          const payload = data.payload || {};
          const upsertMessagesPayload = Array.isArray(payload.messages) ? payload.messages : [];
          if (upsertMessagesPayload.length) {
            upsertMessages(upsertMessagesPayload);
            upsertMessagesPayload.forEach((msg) => {
              updateChatFromMessage({ chatJid: msg.remoteJid, message: { ...msg, upsertType: payload.upsertType } });
            });
            const selected = useChatStore.getState().selectedChatJid;
            if (selected) {
              const matches = upsertMessagesPayload.some((msg) => msg.remoteJid === selected);
              if (matches) {
                void loadMessages(selected);
              }
            }
          }
        }

        if (data.type === 'session.messages.update') {
          const payload = data.payload || {};
          const updates = Array.isArray(payload.updates) ? payload.updates : [];
          if (updates.length) {
            applyStatusUpdates(updates);
          }
        }

        if (data.type === 'session.messages.edit') {
          const payload = data.payload || {};
          const edits = Array.isArray(payload.edits) ? payload.edits : [];
          if (edits.length) {
            applyEdits(edits);
          }
        }

        if (data.type === 'session.messages.delete') {
          const payload = data.payload || {};
          applyDeletes(payload);
        }

        if (data.type === 'session.messages.reaction') {
          const payload = data.payload || {};
          const reactions = Array.isArray(payload.reactions) ? payload.reactions : [];
          if (reactions.length) {
            applyReactions(reactions);
          }
        }

        if (data.type === 'session.messages.media') {
          const payload = data.payload || {};
          const media = Array.isArray(payload.media) ? payload.media : [];
          if (media.length) {
            applyMedia(media);
          }
        }

        if (data.type === 'session.contacts.upsert') {
          const payload = data.payload || {};
          const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
          if (contacts.length) {
            upsertContacts(contacts);
            const nameMap = buildNameMap(contacts);
            useChatStore.getState().applyChatNames(nameMap);
          }
        }

        if (data.type === 'session.presence.update') {
          const payload = data.payload || {};
          if (payload.chatJid && Array.isArray(payload.updates)) {
            updatePresence(payload.chatJid, payload.updates);
          }
        }
      } catch {
        // ignore parse errors
      }
    });
  };

  const startSession = async () => {
    const token = ensureToken();
    if (!token) return;

    setHasRequestedSession(true);
    try {
      const payload = await sessionsApi.startSession(token);
      if (payload?.sessionId) {
        setSessionId(payload.sessionId);
      }
    } catch {
      // ignore start session errors
    }
  };

  const sendMessage = async () => {
    const token = ensureToken();
    const activeChat = useChatStore.getState().selectedChatJid;
    if (!token || !activeChat) return;

    const content = useMessageStore.getState().draftsByChat[activeChat]?.trim() ?? '';
    if (!content) {
      return;
    }

    const sessionIdValue = useSessionStore.getState().sessionId;
    try {
      const payload = await chatsApi.sendMessage(token, activeChat, content, sessionIdValue);
      if (payload?.commandId) {
        clearDraft(activeChat);
      }
    } catch {
      // ignore send errors
    }
  };

  useEffect(() => {
    if (accessToken) {
      void connectWs();
    }
    return () => {
      wsReconnectRef.current.manualClose = true;
      clearWsTimers();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void loadChats();
  }, [accessToken]);

  useEffect(() => {
    if (sessionState.sessionId) {
      setHasRequestedSession(true);
    }
  }, [sessionState.sessionId, setHasRequestedSession]);

  const groupedChats = useMemo(() => {
    const people = [];
    const groups = [];
    for (const chat of chats) {
      if (chat.chatJid?.endsWith('@g.us')) {
        groups.push(chat);
      } else {
        people.push(chat);
      }
    }
    return { people, groups };
  }, [chats]);

  const selectedChat = useMemo(() => {
    if (!selectedChatJid) return null;
    return chats.find((chat) => chat.chatJid === selectedChatJid) || null;
  }, [chats, selectedChatJid]);

  const selectedMessages = useMemo(() => {
    if (!selectedChatJid) return [];
    const bucket = messagesByChat[selectedChatJid];
    if (!bucket) return [];
    return bucket.order.map((id) => bucket.byId[id]);
  }, [messagesByChat, selectedChatJid]);

  const draftMessage = selectedChatJid ? draftsByChat[selectedChatJid] ?? '' : '';

  return {
    ...sessionState,
    groupedChats,
    selectedChat,
    selectedMessages,
    draftMessage,
    startSession,
    selectChat: selectChatAndLoad,
    setDraft: (value) => {
      if (selectedChatJid) {
        setDraft(selectedChatJid, value);
      }
    },
    sendMessage,
  };
};

export default useSessionController;
