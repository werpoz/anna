import 'reflect-metadata';
import { container } from 'tsyringe';
import '../../../User/infrastructure/di/registerUserHandlers';
import { InMemoryCommandBus } from '../CommandBus/InMemoryCommandBus';
import { InMemoryQueryBus } from '../QueryBus/InMemoryQueryBus';
import { TOKENS } from './tokens';
import { ConsoleLogger } from '../Logger/ConsoleLogger';
import { InMemoryUserRepository } from '../../../User/infrastructure/InMemoryUserRepository';
import type { DomainEventSubscriber } from '../../domain/DomainEventSubscriber';
import type { DomainEvent } from '../../domain/DomainEvent';
import { DomainEventSubscribers } from '../EventBus/DomainEventSubscribers';
import { InMemoryEventBus } from '../EventBus/InMemoryEventBus';
import type { CommandHandler } from '../../domain/CommandHandler';
import type { Command } from '../../domain/Command';
import type { QueryHandler } from '../../domain/QueryHandler';
import type { Query } from '../../domain/Query';
import type { Response } from '../../domain/Response';

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
    const resolvedSubscribers = container.resolveAll(
      TOKENS.DomainEventSubscribers
    ) as Array<DomainEventSubscriber<DomainEvent>>;
    const subscribers = DomainEventSubscribers.from(resolvedSubscribers);
    const eventBus = new InMemoryEventBus(subscribers);
    container.registerInstance(TOKENS.EventBus, eventBus);
  }

  const commandHandlers = container.resolveAll(TOKENS.CommandHandlers) as Array<CommandHandler<Command>>;
  const queryHandlers = container.resolveAll(TOKENS.QueryHandlers) as Array<QueryHandler<Query, Response>>;

  const commandBus = new InMemoryCommandBus(commandHandlers);
  const queryBus = new InMemoryQueryBus(queryHandlers);

  return { commandBus, queryBus };
};
