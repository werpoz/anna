import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ContactControllerDeps } from '@/apps/api/controllers/contacts/types';
import { registerListContactsRoute } from '@/apps/api/controllers/contacts/listContacts.controller';

export const registerContactRoutes = (app: Hono<AppEnv>, deps: ContactControllerDeps): void => {
  registerListContactsRoute(app, deps);
};
