import type Redis from 'ioredis';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import { SessionWebsocketHub, type SessionEventMessage } from '@/apps/api/realtime/SessionWebsocketHub';

export class SessionEventStreamConsumer {
  constructor(
    private readonly redis: Redis,
    private readonly stream: string,
    private readonly hub: SessionWebsocketHub
  ) {}

  async start(): Promise<void> {
    let lastId = '$';

    while (true) {
      const response = await this.redis.xread(
        'BLOCK',
        '5000',
        'STREAMS',
        this.stream,
        lastId
      );

      if (!response) {
        continue;
      }

      for (const [, entries] of response) {
        for (const [entryId, fields] of entries as Array<[string, string[]]>) {
          lastId = entryId;
          const data = this.parseFields(fields);
          const eventName = data.eventName;
          if (!eventName || !eventName.startsWith('session.')) {
            continue;
          }

          const payload = this.parsePayload(data.payload);
          if (!payload || typeof payload.tenantId !== 'string') {
            continue;
          }

          const message: SessionEventMessage = {
            type: eventName,
            sessionId: data.aggregateId ?? '',
            eventId: data.eventId,
            occurredOn: data.occurredOn,
            payload,
          };

          this.hub.broadcast(payload.tenantId, message);
        }
      }
    }
  }

  private parseFields(fields: string[]): Record<string, string> {
    const data: Record<string, string> = {};
    for (let index = 0; index < fields.length; index += 2) {
      const key = fields[index];
      const value = fields[index + 1];
      if (key && value !== undefined) {
        data[key] = value;
      }
    }
    return data;
  }

  private parsePayload(payload: string | undefined): Record<string, unknown> | null {
    if (!payload) {
      return null;
    }

    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({ err: message }, 'Session event payload parse failed');
      return null;
    }
  }
}
