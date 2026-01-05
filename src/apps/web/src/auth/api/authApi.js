import { apiFetchRaw } from '../../shared/api/client';

export const login = async (email, password) => {
  return apiFetchRaw('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const refresh = async () => {
  return apiFetchRaw('/auth/refresh', { method: 'POST' });
};

export const logout = async () => {
  return apiFetchRaw('/auth/logout', { method: 'POST' });
};
