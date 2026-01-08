const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    // Add other user properties as needed
  };
}

export interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;



  // Add authorization header if we have an access token
  // The access token is stored in a cookie but backend requires Bearer header
  let token = '';
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(^| )accessToken=([^;]+)/);
    if (match) token = match[2];
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const defaultOptions: RequestInit = {
    headers,
    credentials: 'include',
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return {} as T;
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const data = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data;
  } catch (error) {
    throw error;
  }
}

export async function refreshToken(): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/auth/refresh', {
    method: 'POST',
  });

  // The refreshed access token should be stored in an HTTP-only cookie by the backend

  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // The token removal is handled by the backend via cookie expiration
  }
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>('/users/me');
}

// WebSocket connection helper
export function connectWebSocket(token: string): WebSocket {
  const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/sessions?accessToken=${token}`;
  return new WebSocket(wsUrl);
}