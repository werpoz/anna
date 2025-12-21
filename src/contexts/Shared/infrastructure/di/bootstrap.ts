import 'reflect-metadata';
import { container } from 'tsyringe';
import '../../../User/infrastructure/di/registerUserHandlers';
import { InMemoryCommandBus } from '../CommandBus/InMemoryCommandBus';
import { InMemoryQueryBus } from '../QueryBus/InMemoryQueryBus';
import { TOKENS } from './tokens';
import { ConsoleLogger } from '../Logger/ConsoleLogger';
import { InMemoryUserRepository } from '../../../User/infrastructure/InMemoryUserRepository';
import type { CommandHandler } from '../../domain/CommandHandler';
import type { Command } from '../../domain/Command';
import type { QueryHandler } from '../../domain/QueryHandler';
import type { Query } from '../../domain/Query';
import type { Response } from '../../domain/Response';
import { RedisStreamEventBus } from '../EventBus/RedisStreamEventBus';
import { PostgresOutboxRepository } from '../Outbox/PostgresOutboxRepository';
import { RedisStreamPublisher } from '../EventBus/RedisStreamPublisher';
import { env } from '../config/env';
import { Pool } from 'pg';
import Redis from 'ioredis';

export type AppContext = {
  commandBus: InMemoryCommandBus;
  queryBus: InMemoryQueryBus;
};

export const buildAppContext = (): AppContext => {
  if (!container.isRegistered(TOKENS.Logger)) {
    container.registerSingleton(TOKENS.Logger, ConsoleLogger);
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
