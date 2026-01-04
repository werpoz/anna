import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { env } from '@/contexts/Shared/infrastructure/config/env';

const cookieOptions = {
  httpOnly: true,
  path: '/',
  sameSite: env.authCookieSameSite,
  secure: env.authCookieSecure,
};

export const getRefreshCookie = (c: Context): string | undefined => {
  return getCookie(c, env.authRefreshCookieName);
};

export const setRefreshCookie = (c: Context, token: string, maxAgeSeconds: number): void => {
  setCookie(c, env.authRefreshCookieName, token, {
    ...cookieOptions,
    maxAge: maxAgeSeconds,
  });
};

export const clearRefreshCookie = (c: Context): void => {
  deleteCookie(c, env.authRefreshCookieName, cookieOptions);
};
