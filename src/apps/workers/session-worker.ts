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
import { S3Storage } from '@/contexts/Shared/infrastructure/Storage/S3Storage';
import type { MediaStorage } from '@/contexts/Shared/domain/Storage/MediaStorage';
import { UpdateSessionQr } from '@/contexts/Core/Session/application/use-cases/UpdateSessionQr';
import { ConnectSession } from '@/contexts/Core/Session/application/use-cases/ConnectSession';
import { DisconnectSession } from '@/contexts/Core/Session/application/use-cases/DisconnectSession';
import { StartSession } from '@/contexts/Core/Session/application/use-cases/StartSession';
import { StopSession } from '@/contexts/Core/Session/application/use-cases/StopSession';
import { SendSessionMessage } from '@/contexts/Core/Session/application/use-cases/SendSessionMessage';
import { SessionService } from '@/contexts/Core/Session/application/SessionService';
import { RedisSessionCommandConsumer } from '@/contexts/Core/Session/infrastructure/RedisSessionCommandConsumer';
import { DeleteSession } from '@/contexts/Core/Session/application/use-cases/DeleteSession';
import { ReadSessionMessages } from '@/contexts/Core/Session/application/use-cases/ReadSessionMessages';
import { EditSessionMessage } from '@/contexts/Core/Session/application/use-cases/EditSessionMessage';
import { DeleteSessionMessage } from '@/contexts/Core/Session/application/use-cases/DeleteSessionMessage';
import { ReactSessionMessage } from '@/contexts/Core/Session/application/use-cases/ReactSessionMessage';
import { PostgresSessionAuthRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionAuthRepository';
import { PublishSessionHistorySync } from '@/contexts/Core/Session/application/use-cases/PublishSessionHistorySync';
import { PublishSessionMessagesUpsert } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesUpsert';
import { PublishSessionContactsUpsert } from '@/contexts/Core/Session/application/use-cases/PublishSessionContactsUpsert';
import { PublishSessionMessagesUpdate } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesUpdate';
import { PublishSessionPresenceUpdate } from '@/contexts/Core/Session/application/use-cases/PublishSessionPresenceUpdate';
import { PublishSessionMessagesEdit } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesEdit';
import { PublishSessionMessagesDelete } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesDelete';
import { PublishSessionMessagesReaction } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesReaction';
import { PublishSessionMessagesMedia } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesMedia';
import { PostgresSessionMessageRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageRepository';
import { PostgresSessionChatRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionChatRepository';
import { PostgresSessionContactRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionContactRepository';
import { PostgresSessionMessageReactionRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageReactionRepository';
import { PostgresSessionMessageMediaRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageMediaRepository';
import { PostgresSessionChatAliasRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionChatAliasRepository';

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

const mediaStorage: MediaStorage | null =
  env.s3Endpoint && env.s3Bucket && env.s3AccessKey && env.s3SecretKey
    ? new S3Storage()
    : null;

const sessionProvider = new BaileysSessionProvider({
  pool,
  qrTtlMs: env.sessionsQrTtlMs,
  printQrInTerminal: env.sessionsPrintQr,
  browserName: env.sessionsBrowserName,
  markOnlineOnConnect: env.sessionsMarkOnlineOnConnect,
  mediaStorage,
});

const updateSessionQr = new UpdateSessionQr(sessionRepository, eventBus);
const connectSession = new ConnectSession(sessionRepository, eventBus);
const disconnectSession = new DisconnectSession(sessionRepository, eventBus);
const publishSessionHistorySync = new PublishSessionHistorySync(eventBus);
const publishSessionMessagesUpsert = new PublishSessionMessagesUpsert(eventBus);
const publishSessionContactsUpsert = new PublishSessionContactsUpsert(eventBus);
const publishSessionMessagesUpdate = new PublishSessionMessagesUpdate(eventBus);
const publishSessionPresenceUpdate = new PublishSessionPresenceUpdate(eventBus);
const publishSessionMessagesEdit = new PublishSessionMessagesEdit(eventBus);
const publishSessionMessagesDelete = new PublishSessionMessagesDelete(eventBus);
const publishSessionMessagesReaction = new PublishSessionMessagesReaction(eventBus);
const publishSessionMessagesMedia = new PublishSessionMessagesMedia(eventBus);
const sessionAuthRepository = new PostgresSessionAuthRepository(pool);
const sessionMessageRepository = new PostgresSessionMessageRepository(pool);
const startSession = new StartSession(
  sessionRepository,
  eventBus,
  sessionProvider,
  updateSessionQr,
  connectSession,
  disconnectSession,
  publishSessionHistorySync,
  publishSessionMessagesUpsert,
  publishSessionContactsUpsert,
  publishSessionMessagesUpdate,
  publishSessionPresenceUpdate,
  publishSessionMessagesEdit,
  publishSessionMessagesDelete,
  publishSessionMessagesReaction,
  publishSessionMessagesMedia
);
const stopSession = new StopSession(sessionRepository, eventBus, sessionProvider);
const sendSessionMessage = new SendSessionMessage(
  sessionRepository,
  sessionMessageRepository,
  sessionProvider
);
const sessionChatRepository = new PostgresSessionChatRepository(pool);
const sessionContactRepository = new PostgresSessionContactRepository(pool);
const sessionMessageReactionRepository = new PostgresSessionMessageReactionRepository(pool);
const sessionMessageMediaRepository = new PostgresSessionMessageMediaRepository(pool);
const sessionChatAliasRepository = new PostgresSessionChatAliasRepository(pool);
const deleteSession = new DeleteSession(
  sessionRepository,
  sessionAuthRepository,
  sessionMessageRepository,
  sessionChatRepository,
  sessionContactRepository,
  sessionMessageReactionRepository,
  sessionMessageMediaRepository,
  sessionChatAliasRepository,
  sessionProvider
);
const readSessionMessages = new ReadSessionMessages(
  sessionRepository,
  sessionMessageRepository,
  sessionProvider
);
const editSessionMessage = new EditSessionMessage(
  sessionRepository,
  sessionMessageRepository,
  sessionProvider
);
const deleteSessionMessage = new DeleteSessionMessage(
  sessionRepository,
  sessionMessageRepository,
  sessionProvider
);
const reactSessionMessage = new ReactSessionMessage(
  sessionRepository,
  sessionMessageRepository,
  sessionProvider
);
const sessionService = new SessionService(
  startSession,
  stopSession,
  sendSessionMessage,
  deleteSession,
  readSessionMessages,
  editSessionMessage,
  deleteSessionMessage,
  reactSessionMessage
);

const consumer = new RedisSessionCommandConsumer(redis, sessionService, {
  stream: env.sessionsCommandStream,
  group: env.sessionsCommandGroup,
  consumer: env.sessionsCommandConsumer,
  blockMs: env.sessionsCommandBlockMs,
  batchSize: env.sessionsCommandBatchSize,
  dlqStream: env.sessionsCommandDlqStream,
});

logger.info('Session worker started');

// Auto-Resume: Reconnect all active sessions on startup
logger.info('Auto-resume: Checking for active sessions...');
try {
  const allSessions = await sessionRepository.searchAll();
  logger.info(`Found ${allSessions.length} total sessions in database`);

  const sessionsToResume = allSessions.filter(
    (session) => session.status.value !== 'disconnected'
  );

  if (sessionsToResume.length === 0) {
    logger.info('No active sessions to resume');
  } else {
    logger.info(`Resuming ${sessionsToResume.length} active session(s)...`);

    for (const session of sessionsToResume) {
      try {
        logger.info(
          `Resuming session ${session.id.value} (status: ${session.status.value}, tenant: ${session.tenantId.value})`
        );
        await startSession.execute(session.id.value, session.tenantId.value);
        logger.info(`✓ Session ${session.id.value} resumed successfully`);
      } catch (error) {
        logger.error(
          error as Error,
          `✗ Failed to resume session ${session.id.value}`
        );
      }
    }

    logger.info('Auto-resume completed');
  }
} catch (error) {
  logger.error(error as Error, 'Auto-resume failed with error');
}

await consumer.start();
