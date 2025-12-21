import 'reflect-metadata';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { container } from 'tsyringe';
import { env } from '../contexts/Shared/infrastructure/config/env';
import { ConsoleLogger } from '../contexts/Shared/infrastructure/Logger/ConsoleLogger';
import { TOKENS } from '../contexts/Shared/infrastructure/di/tokens';
import { DomainEventSubscribers } from '../contexts/Shared/infrastructure/EventBus/DomainEventSubscribers';
import { RedisStreamEventConsumer } from '../contexts/Shared/infrastructure/EventBus/RedisStreamEventConsumer';
import { PostgresDeadLetterRepository } from '../contexts/Shared/infrastructure/DeadLetter/PostgresDeadLetterRepository';
import type { DomainEventSubscriber } from '../contexts/Shared/domain/DomainEventSubscriber';
import type { DomainEvent } from '../contexts/Shared/domain/DomainEvent';
import '../contexts/User/infrastructure/di/registerUserHandlers';

if (!container.isRegistered(TOKENS.Logger)) {
  container.registerSingleton(TOKENS.Logger, ConsoleLogger);
}

const subscribers = DomainEventSubscribers.from(
  container.resolveAll(TOKENS.DomainEventSubscribers) as Array<DomainEventSubscriber<DomainEvent>>
);

const redis = new Redis(env.redisUrl);
const pool = new Pool({ connectionString: env.databaseUrl });
const deadLetterRepository = new PostgresDeadLetterRepository(pool);
const consumer = new RedisStreamEventConsumer(redis, subscribers, {
  stream: env.eventsStream,
  group: env.eventsGroup,
  consumer: env.eventsConsumer,
  batchSize: 50,
  blockMs: 5000,
  claimIdleMs: env.eventsClaimIdleMs,
  claimIntervalMs: env.eventsClaimIntervalMs,
  maxAttempts: env.eventsMaxAttempts,
  backoffMs: env.eventsBackoffMs,
  backoffMaxMs: env.eventsBackoffMaxMs,
  processedTtlMs: env.eventsProcessedTtlMs,
  dlqStream: env.eventsDlqStream,
}, deadLetterRepository);

await consumer.start();
