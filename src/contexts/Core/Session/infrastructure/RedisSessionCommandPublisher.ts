import type Redis from 'ioredis';
import type {
  SessionCommand,
  SessionCommandPublisher,
} from '@/contexts/Core/Session/application/SessionCommandPublisher';
import { env } from '@/contexts/Shared/infrastructure/config/env';

export class RedisSessionCommandPublisher implements SessionCommandPublisher {
  constructor(
    private readonly redis: Redis,
    private readonly stream: string
  ) { }

  async publish(command: SessionCommand): Promise<void> {
    await this.redis.xadd(
      this.stream,
      'MAXLEN',
      '~',
      env.sessionsCommandStreamMaxLen,
      '*',
      'commandId',
      command.commandId,
      'type',
      command.type,
      'payload',
      JSON.stringify(command),
      'occurredOn',
      new Date().toISOString()
    );
  }
}
