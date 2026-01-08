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

export const getAccessCookie = (c: Context): string | undefined => {
  return getCookie(c, env.authAccessCookieName);
};

export const setRefreshCookie = (c: Context, token: string, maxAgeSeconds: number): void => {
  setCookie(c, env.authRefreshCookieName, token, {
    ...cookieOptions,
    maxAge: maxAgeSeconds,
  });
};

export const setAccessCookie = (c: Context, token: string, maxAgeSeconds: number): void => {
  setCookie(c, env.authAccessCookieName, token, {
    ...cookieOptions,
    maxAge: maxAgeSeconds,
  });
};

export const clearRefreshCookie = (c: Context): void => {
  deleteCookie(c, env.authRefreshCookieName, cookieOptions);
};

export const clearAccessCookie = (c: Context): void => {
  deleteCookie(c, env.authAccessCookieName, cookieOptions);
};

export const clearAllAuthCookies = (c: Context): void => {
  clearRefreshCookie(c);
  clearAccessCookie(c);
};
