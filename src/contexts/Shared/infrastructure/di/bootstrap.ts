import 'reflect-metadata';
import { container } from 'tsyringe';
import '@/contexts/User/infrastructure/di/registerUserHandlers';
import { InMemoryCommandBus } from '@/contexts/Shared/infrastructure/CommandBus/InMemoryCommandBus';
import { InMemoryQueryBus } from '@/contexts/Shared/infrastructure/QueryBus/InMemoryQueryBus';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { PinoLogger } from '@/contexts/Shared/infrastructure/Logger/PinoLogger';
import { InMemoryUserRepository } from '@/contexts/User/infrastructure/InMemoryUserRepository';
import type { CommandHandler } from '@/contexts/Shared/domain/CommandHandler';
import type { Command } from '@/contexts/Shared/domain/Command';
import type { QueryHandler } from '@/contexts/Shared/domain/QueryHandler';
import type { Query } from '@/contexts/Shared/domain/Query';
import type { Response } from '@/contexts/Shared/domain/Response';
import { RedisStreamEventBus } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamEventBus';
import { PostgresOutboxRepository } from '@/contexts/Shared/infrastructure/Outbox/PostgresOutboxRepository';
import { RedisStreamPublisher } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamPublisher';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import { Pool } from 'pg';
import Redis from 'ioredis';

export type AppContext = {
  commandBus: InMemoryCommandBus;
  queryBus: InMemoryQueryBus;
};

export const buildAppContext = (): AppContext => {
  if (!container.isRegistered(TOKENS.Logger)) {
    container.registerSingleton(TOKENS.Logger, PinoLogger);
  }

  if (!container.isRegistered(TOKENS.UserRepository)) {
    container.registerSingleton(TOKENS.UserRepository, InMemoryUserRepository);
  }

  if (!container.isRegistered(TOKENS.EventBus)) {
    const pool = new Pool({ connectionString: env.databaseUrl });
    const redis = new Redis(env.redisUrl);
    const outboxRepository = new PostgresOutboxRepository(pool);
    const publisher = new RedisStreamPublisher(redis, env.eventsStream);
    const eventBus = new RedisStreamEventBus(outboxRepository, publisher);
    container.registerInstance(TOKENS.EventBus, eventBus);
  }

  const commandHandlers = container.resolveAll(TOKENS.CommandHandlers) as Array<CommandHandler<Command>>;
  const queryHandlers = container.resolveAll(TOKENS.QueryHandlers) as Array<QueryHandler<Query, Response>>;

  const commandBus = new InMemoryCommandBus(commandHandlers);
  const queryBus = new InMemoryQueryBus(queryHandlers);

  return { commandBus, queryBus };
};
