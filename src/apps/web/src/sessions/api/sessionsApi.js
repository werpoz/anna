import { apiFetch } from '../../shared/api/client';

export const startSession = async (accessToken) => {
  return apiFetch('/sessions', { method: 'POST' }, accessToken);
};
