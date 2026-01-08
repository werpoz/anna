const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface LoginResponse {
  accessTokenExpiresIn: number;
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

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

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

  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>('/users/me');
}

// WebSocket connection helper
export function connectWebSocket(): WebSocket {
  const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/sessions`;
  return new WebSocket(wsUrl);
}