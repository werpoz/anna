import { apiFetch } from '../../shared/api/client';

export const listContacts = async (accessToken, sessionId) => {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
  return apiFetch(`/contacts${query}`, {}, accessToken);
};
