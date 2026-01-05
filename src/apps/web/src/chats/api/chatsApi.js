import { apiFetch } from '../../shared/api/client';

export const listChats = async (accessToken, sessionId) => {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
  return apiFetch(`/chats${query}`, {}, accessToken);
};

export const listMessages = async (accessToken, chatJid, sessionId, cursor) => {
  const params = new URLSearchParams({ limit: '50' });
  if (sessionId) params.set('sessionId', sessionId);
  if (cursor) params.set('cursor', cursor);
  return apiFetch(`/chats/${encodeURIComponent(chatJid)}/messages?${params.toString()}`, {}, accessToken);
};

export const sendMessage = async (accessToken, chatJid, content, sessionId) => {
  return apiFetch(
    `/chats/${encodeURIComponent(chatJid)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content, sessionId }),
    },
    accessToken
  );
};

export const markRead = async (accessToken, chatJid, messageIds) => {
  return apiFetch(
    `/chats/${encodeURIComponent(chatJid)}/read`,
    {
      method: 'POST',
      body: JSON.stringify({ messageIds }),
    },
    accessToken
  );
};
