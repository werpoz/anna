import { API_BASE_URL } from '../config';

const parsePayload = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const apiFetchRaw = async (path, options = {}, accessToken) => {
  const headers = {
    ...(options.headers || {}),
  };

  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (hasBody && !isFormData) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  const payload = await parsePayload(response);
  return { ok: response.ok, status: response.status, payload };
};

export const apiFetch = async (path, options = {}, accessToken) => {
  const result = await apiFetchRaw(path, options, accessToken);
  if (!result.ok) {
    const message =
      (result.payload && typeof result.payload === 'object' && result.payload.message) ||
      `Request failed (${result.status})`;
    const error = new Error(message);
    error.status = result.status;
    error.payload = result.payload;
    throw error;
  }
  return result.payload;
};
