import { Pool } from 'pg';
import Redis from 'ioredis';
import { env } from '../contexts/Shared/infrastructure/config/env';
import { RedisStreamPublisher } from '../contexts/Shared/infrastructure/EventBus/RedisStreamPublisher';
import { OutboxDispatcher } from '../contexts/Shared/infrastructure/Outbox/OutboxDispatcher';
import { PostgresOutboxRepository } from '../contexts/Shared/infrastructure/Outbox/PostgresOutboxRepository';

const pool = new Pool({ connectionString: env.databaseUrl });
const redis = new Redis(env.redisUrl);

const outboxRepository = new PostgresOutboxRepository(pool);
const publisher = new RedisStreamPublisher(redis, env.eventsStream);
const dispatcher = new OutboxDispatcher(outboxRepository, publisher, {
  batchSize: env.outboxBatchSize,
  intervalMs: env.outboxIntervalMs,
});

await dispatcher.start();
