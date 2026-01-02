import 'reflect-metadata';
import { container } from 'tsyringe';
import '@/contexts/Core/User/infrastructure/di/registerUserHandlers';
import { InMemoryCommandBus } from '@/contexts/Shared/infrastructure/CommandBus/InMemoryCommandBus';
import { InMemoryQueryBus } from '@/contexts/Shared/infrastructure/QueryBus/InMemoryQueryBus';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { PinoLogger } from '@/contexts/Shared/infrastructure/Logger/PinoLogger';
import { ResendEmailSender } from '@/contexts/Shared/infrastructure/EmailSender/ResendEmailSender';
import { InMemoryUserRepository } from '@/contexts/Core/User/infrastructure/InMemoryUserRepository';
import { InMemoryRefreshTokenRepository } from '@/contexts/Core/Auth/infrastructure/InMemoryRefreshTokenRepository';
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
import { AuthService } from '@/contexts/Core/Auth/application/AuthService';
import { AuthTokensService } from '@/contexts/Core/Auth/application/services/AuthTokensService';
import { LoginUser } from '@/contexts/Core/Auth/application/use-cases/LoginUser';
import { IssueTokensForUserId } from '@/contexts/Core/Auth/application/use-cases/IssueTokensForUserId';
import { RefreshSession } from '@/contexts/Core/Auth/application/use-cases/RefreshSession';
import { LogoutUser } from '@/contexts/Core/Auth/application/use-cases/LogoutUser';
import { LogoutAllUserSessions } from '@/contexts/Core/Auth/application/use-cases/LogoutAllUserSessions';
import { ResendVerification } from '@/contexts/Core/Auth/application/use-cases/ResendVerification';
import { RequestPasswordReset } from '@/contexts/Core/Auth/application/use-cases/RequestPasswordReset';
import { ResetPassword } from '@/contexts/Core/Auth/application/use-cases/ResetPassword';
import { JwtAccessTokenSigner } from '@/contexts/Core/Auth/infrastructure/JwtAccessTokenSigner';
import { CryptoRefreshTokenHasher } from '@/contexts/Core/Auth/infrastructure/CryptoRefreshTokenHasher';
import { CryptoRefreshTokenGenerator } from '@/contexts/Core/Auth/infrastructure/CryptoRefreshTokenGenerator';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import type { RefreshTokenRepository } from '@/contexts/Core/Auth/domain/RefreshTokenRepository';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export type AppContext = {
  commandBus: InMemoryCommandBus;
  queryBus: InMemoryQueryBus;
  authService: AuthService;
};

export const buildAppContext = (): AppContext => {
  if (!container.isRegistered(TOKENS.Logger)) {
    container.registerSingleton(TOKENS.Logger, PinoLogger);
  }

  if (!container.isRegistered(TOKENS.EmailSender)) {
    container.registerSingleton(TOKENS.EmailSender, ResendEmailSender);
  }

  if (!container.isRegistered(TOKENS.UserRepository)) {
    container.registerSingleton(TOKENS.UserRepository, InMemoryUserRepository);
  }

  if (!container.isRegistered(TOKENS.RefreshTokenRepository)) {
    container.registerSingleton(TOKENS.RefreshTokenRepository, InMemoryRefreshTokenRepository);
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
  const userRepository = container.resolve<UserRepository>(TOKENS.UserRepository);
  const refreshTokenRepository = container.resolve<RefreshTokenRepository>(TOKENS.RefreshTokenRepository);
  const eventBus = container.resolve<EventBus>(TOKENS.EventBus);

  const accessTokenSigner = new JwtAccessTokenSigner(env.authJwtSecret);
  const refreshTokenHasher = new CryptoRefreshTokenHasher();
  const refreshTokenGenerator = new CryptoRefreshTokenGenerator();
  const tokensService = new AuthTokensService(
    refreshTokenRepository,
    accessTokenSigner,
    refreshTokenHasher,
    refreshTokenGenerator,
    env.authAccessTokenTtlMs,
    env.authRefreshTokenTtlMs
  );

  const authService = new AuthService(
    new LoginUser(userRepository, tokensService),
    new IssueTokensForUserId(userRepository, tokensService),
    new RefreshSession(refreshTokenRepository, refreshTokenHasher, userRepository, tokensService),
    new LogoutUser(refreshTokenRepository, refreshTokenHasher),
    new LogoutAllUserSessions(refreshTokenRepository),
    new ResendVerification(userRepository, eventBus),
    new RequestPasswordReset(userRepository, eventBus, env.authPasswordResetTtlMs),
    new ResetPassword(userRepository, eventBus)
  );

  return { commandBus, queryBus, authService };
};
