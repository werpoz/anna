import { env } from '@/contexts/Shared/infrastructure/config/env';

export const buildRefreshCookie = (token: string, maxAgeSeconds: number): string => {
  const secure = env.authCookieSecure ? '; Secure' : '';
  return `${env.authRefreshCookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Strict${secure}`;
};

export const clearRefreshCookie = (): string => {
  const secure = env.authCookieSecure ? '; Secure' : '';
  return `${env.authRefreshCookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secure}`;
};
