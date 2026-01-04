import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ChatControllerDeps } from '@/apps/api/controllers/chats/types';
import { registerListChatsRoute } from '@/apps/api/controllers/chats/listChats.controller';
import { registerListChatMessagesRoute } from '@/apps/api/controllers/chats/listChatMessages.controller';
import { registerSendChatMessageRoute } from '@/apps/api/controllers/chats/sendChatMessage.controller';

export const registerChatRoutes = (app: Hono<AppEnv>, deps: ChatControllerDeps): void => {
  registerListChatsRoute(app, deps);
  registerListChatMessagesRoute(app, deps);
  registerSendChatMessageRoute(app, deps);
};
