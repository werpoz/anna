import type { Hono } from 'hono';
import type { AppEnv } from '@/apps/api/types';
import type { ChatControllerDeps } from '@/apps/api/controllers/chats/types';
import { registerListChatsRoute } from '@/apps/api/controllers/chats/listChats.controller';
import { registerListChatMessagesRoute } from '@/apps/api/controllers/chats/listChatMessages.controller';
import { registerSendChatMessageRoute } from '@/apps/api/controllers/chats/sendChatMessage.controller';
import { registerReadChatMessagesRoute } from '@/apps/api/controllers/chats/readChatMessages.controller';
import { registerEditChatMessageRoute } from '@/apps/api/controllers/chats/editChatMessage.controller';
import { registerDeleteChatMessageRoute } from '@/apps/api/controllers/chats/deleteChatMessage.controller';
import { registerReactChatMessageRoute } from '@/apps/api/controllers/chats/reactChatMessage.controller';

export const registerChatRoutes = (app: Hono<AppEnv>, deps: ChatControllerDeps): void => {
  registerListChatsRoute(app, deps);
  registerListChatMessagesRoute(app, deps);
  registerSendChatMessageRoute(app, deps);
  registerReadChatMessagesRoute(app, deps);
  registerEditChatMessageRoute(app, deps);
  registerDeleteChatMessageRoute(app, deps);
  registerReactChatMessageRoute(app, deps);
};
