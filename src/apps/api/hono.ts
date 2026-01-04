import { Hono } from 'hono';
import type { ServerWebSocket } from 'bun';
import { buildAppContext } from '@/contexts/Shared/infrastructure/di/bootstrap';
import { registerUserRoutes } from '@/apps/api/controllers/users';
import { registerMetricsRoutes } from '@/apps/api/controllers/metrics';
import { registerAuthRoutes } from '@/apps/api/controllers/auth';
import { registerSessionRoutes } from '@/apps/api/controllers/sessions';
import { registerChatRoutes } from '@/apps/api/controllers/chats';
import { registerContactRoutes } from '@/apps/api/controllers/contacts';
import { initTelemetry } from '@/contexts/Shared/infrastructure/observability/telemetry';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { AppEnv } from '@/apps/api/types';
import Redis from 'ioredis';
import { cors } from 'hono/cors';
import { verifyAccessToken } from '@/apps/api/http/verifyAccessToken';
import { SessionWebsocketHub, type SessionSocketData } from '@/apps/api/realtime/SessionWebsocketHub';
import { SessionEventStreamConsumer } from '@/apps/api/realtime/SessionEventStreamConsumer';
import { SessionTenantId } from '@/contexts/Core/Session/domain/SessionTenantId';

initTelemetry(`${env.otelServiceName}-hono`);

const {
  commandBus,
  queryBus,
  authService,
  sessionCommandPublisher,
  sessionRepository,
  sessionMessageRepository,
  sessionChatRepository,
  sessionContactRepository,
  sessionMessageReactionRepository,
} = buildAppContext();

const app = new Hono<AppEnv>();

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) {
        return env.corsOrigins[0] ?? '';
      }
      return env.corsOrigins.includes(origin) ? origin : null;
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

registerUserRoutes(app, { commandBus, queryBus, authService });
registerAuthRoutes(app, { authService });
registerSessionRoutes(app, { sessionCommandPublisher });
registerChatRoutes(app, {
  sessionCommandPublisher,
  sessionRepository,
  messageRepository: sessionMessageRepository,
  chatRepository: sessionChatRepository,
  reactionRepository: sessionMessageReactionRepository,
});
registerContactRoutes(app, {
  sessionRepository,
  contactRepository: sessionContactRepository,
});
registerMetricsRoutes(app);

const sessionHub = new SessionWebsocketHub();
const sessionEventsRedis = new Redis(env.redisUrl);
const sessionEventsConsumer = new SessionEventStreamConsumer(
  sessionEventsRedis,
  env.eventsStream,
  sessionHub
);
void sessionEventsConsumer.start();

const sendSessionSnapshot = async (ws: ServerWebSocket<SessionSocketData>): Promise<void> => {
  const tenantId = ws.data.auth.userId;
  const sessions = await sessionRepository.searchByTenant(new SessionTenantId(tenantId));
  const connected = sessions.find((session) => session.status.value === 'connected');
  const session = connected ?? sessions[0] ?? null;

  if (ws.readyState !== 1) {
    return;
  }

  const payload = {
    tenantId,
    session: session ? session.toPrimitives() : null,
  };

  ws.send(
    JSON.stringify({
      type: 'session.snapshot',
      sessionId: session?.id.value ?? '',
      payload,
    })
  );
};

const server = Bun.serve<SessionSocketData>({
  port: 3000,
  fetch: async (req, server) => {
    const url = new URL(req.url);
    if (url.pathname === '/ws/sessions') {
      const authHeader = req.headers.get('authorization') ?? '';
      const [, headerToken] = authHeader.split(' ');
      const token = headerToken || url.searchParams.get('accessToken') || url.searchParams.get('token');

      if (!token) {
        return new Response('missing access token', { status: 401 });
      }

      const auth = await verifyAccessToken(token);
      if (!auth) {
        return new Response('invalid access token', { status: 401 });
      }

      const upgraded = server.upgrade(req, { data: { auth } });
      if (upgraded) {
        return new Response(null, { status: 101 });
      }

      return new Response('upgrade failed', { status: 400 });
    }

    return app.fetch(req);
  },
  websocket: {
    message: () => {},
    open: (ws) => {
      sessionHub.add(ws);
      void sendSessionSnapshot(ws);
    },
    close: (ws) => {
      sessionHub.remove(ws);
    },
  },
});

console.log(`Hono app listening on http://localhost:${server.port}`);
