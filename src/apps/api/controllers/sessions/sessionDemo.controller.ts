import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';

export const registerSessionDemoRoute = (app: Hono<AppEnv>): void => {
  app.get('/demo/sessions', async (c) => {
    const html = await Bun.file('public/sessions.html').text();
    return c.html(html);
  });
};
