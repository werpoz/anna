import type Redis from 'ioredis';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import type { SessionService } from '@/contexts/Core/Session/application/SessionService';
import type { SessionCommand } from '@/contexts/Core/Session/application/SessionCommandPublisher';

export type RedisSessionCommandConsumerOptions = {
  stream: string;
  group: string;
  consumer: string;
  blockMs: number;
  batchSize: number;
  dlqStream?: string;
};

type RedisEntry = [string, string[]];

type ParsedCommand = {
  command: SessionCommand;
  raw: Record<string, string>;
};

export class RedisSessionCommandConsumer {
  constructor(
    private readonly redis: Redis,
    private readonly sessionService: SessionService,
    private readonly options: RedisSessionCommandConsumerOptions
  ) {}

  async start(): Promise<void> {
    await this.ensureGroup();

    while (true) {
      const response = (await this.redis.xreadgroup(
        'GROUP',
        this.options.group,
        this.options.consumer,
        'COUNT',
        String(this.options.batchSize),
        'BLOCK',
        String(this.options.blockMs),
        'STREAMS',
        this.options.stream,
        '>'
      )) as Array<[string, Array<RedisEntry>]> | null;

      if (!response) {
        continue;
      }

      for (const [, entries] of response) {
        for (const [entryId, fields] of entries) {
          const parsed = this.parseCommand(fields);
          if (!parsed) {
            await this.redis.xack(this.options.stream, this.options.group, entryId);
            continue;
          }

          try {
            await this.handleCommand(parsed.command);
            await this.redis.xack(this.options.stream, this.options.group, entryId);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error({ err: message, commandId: parsed.raw.commandId }, 'Session command failed');
            await this.redis.xack(this.options.stream, this.options.group, entryId);
            await this.publishToDlq(parsed, message, entryId);
          }
        }
      }
    }
  }

  private async ensureGroup(): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', this.options.stream, this.options.group, '$', 'MKSTREAM');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  private parseCommand(fields: string[]): ParsedCommand | null {
    const data: Record<string, string> = {};
    for (let index = 0; index < fields.length; index += 2) {
      const key = fields[index];
      const value = fields[index + 1];
      if (key && value !== undefined) {
        data[key] = value;
      }
    }

    if (!data.payload) {
      return null;
    }

    try {
      const command = JSON.parse(data.payload) as SessionCommand;
      if (!command || typeof command.type !== 'string') {
        return null;
      }
      return { command, raw: data };
    } catch {
      return null;
    }
  }

  private async handleCommand(command: SessionCommand): Promise<void> {
    switch (command.type) {
      case 'session.start':
        await this.sessionService.start(command.sessionId, command.tenantId);
        return;
      case 'session.stop':
        await this.sessionService.stop(command.sessionId, command.reason);
        return;
      case 'session.sendMessage':
        await this.sessionService.sendMessage({
          sessionId: command.sessionId,
          to: command.to,
          content: command.content,
          media: command.media ?? null,
          caption: command.caption ?? null,
          ptt: command.ptt ?? false,
          messageId: command.messageId,
          replyToMessageId: command.replyToMessageId,
          forwardMessageId: command.forwardMessageId,
        });
        return;
      case 'session.readMessages':
        await this.sessionService.readMessages(command.sessionId, command.messageIds);
        return;
      case 'session.editMessage':
        await this.sessionService.editMessage(command.sessionId, command.messageId, command.content);
        return;
      case 'session.deleteMessage':
        await this.sessionService.deleteMessage(command.sessionId, command.messageId);
        return;
      case 'session.reactMessage':
        await this.sessionService.reactMessage(command.sessionId, command.messageId, command.emoji ?? null);
        return;
      case 'session.delete':
        await this.sessionService.delete(command.sessionId);
        return;
      default:
        throw new Error(`Unknown session command: ${(command as SessionCommand).type}`);
    }
  }

  private async publishToDlq(
    parsed: ParsedCommand,
    errorMessage: string,
    entryId: string
  ): Promise<void> {
    if (!this.options.dlqStream) {
      return;
    }

    await this.redis.xadd(
      this.options.dlqStream,
      '*',
      'commandId',
      parsed.raw.commandId ?? '',
      'type',
      parsed.command.type,
      'entryId',
      entryId,
      'error',
      errorMessage,
      'payload',
      JSON.stringify(parsed.command),
      'failedAt',
      new Date().toISOString()
    );
  }
}
