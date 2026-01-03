import 'reflect-metadata';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import { initTelemetry } from '@/contexts/Shared/infrastructure/observability/telemetry';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import { startMetricsServer } from '@/contexts/Shared/infrastructure/observability/metricsServer';
import { PostgresOutboxRepository } from '@/contexts/Shared/infrastructure/Outbox/PostgresOutboxRepository';
import { RedisStreamPublisher } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamPublisher';
import { RedisStreamEventBus } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamEventBus';
import { PostgresSessionRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionRepository';
import { BaileysSessionProvider } from '@/contexts/Core/Session/infrastructure/BaileysSessionProvider';
import { UpdateSessionQr } from '@/contexts/Core/Session/application/use-cases/UpdateSessionQr';
import { ConnectSession } from '@/contexts/Core/Session/application/use-cases/ConnectSession';
import { DisconnectSession } from '@/contexts/Core/Session/application/use-cases/DisconnectSession';
import { StartSession } from '@/contexts/Core/Session/application/use-cases/StartSession';
import { StopSession } from '@/contexts/Core/Session/application/use-cases/StopSession';
import { SendSessionMessage } from '@/contexts/Core/Session/application/use-cases/SendSessionMessage';
import { SessionService } from '@/contexts/Core/Session/application/SessionService';
import { RedisSessionCommandConsumer } from '@/contexts/Core/Session/infrastructure/RedisSessionCommandConsumer';

initTelemetry(`${env.otelServiceName}-sessions`);

if (env.metricsPort) {
  startMetricsServer(env.metricsPort);
}

const pool = new Pool({ connectionString: env.databaseUrl });
const redis = new Redis(env.redisUrl);

const outboxRepository = new PostgresOutboxRepository(pool);
const publisher = new RedisStreamPublisher(redis, env.eventsStream);
const eventBus = new RedisStreamEventBus(outboxRepository, publisher);

const sessionRepository = new PostgresSessionRepository(pool);
const sessionProvider = new BaileysSessionProvider({
  pool,
  qrTtlMs: env.sessionsQrTtlMs,
  printQrInTerminal: env.sessionsPrintQr,
  browserName: env.sessionsBrowserName,
  markOnlineOnConnect: env.sessionsMarkOnlineOnConnect,
});

const updateSessionQr = new UpdateSessionQr(sessionRepository, eventBus);
const connectSession = new ConnectSession(sessionRepository, eventBus);
const disconnectSession = new DisconnectSession(sessionRepository, eventBus);
const startSession = new StartSession(
  sessionRepository,
  eventBus,
  sessionProvider,
  updateSessionQr,
  connectSession,
  disconnectSession
);
const stopSession = new StopSession(sessionRepository, eventBus, sessionProvider);
const sendSessionMessage = new SendSessionMessage(sessionRepository, sessionProvider);
const sessionService = new SessionService(startSession, stopSession, sendSessionMessage);

const consumer = new RedisSessionCommandConsumer(redis, sessionService, {
  stream: env.sessionsCommandStream,
  group: env.sessionsCommandGroup,
  consumer: env.sessionsCommandConsumer,
  blockMs: env.sessionsCommandBlockMs,
  batchSize: env.sessionsCommandBatchSize,
  dlqStream: env.sessionsCommandDlqStream,
});

logger.info('Session worker started');

await consumer.start();
