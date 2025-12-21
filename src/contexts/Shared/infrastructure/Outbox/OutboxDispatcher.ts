import type { OutboxRepository } from './OutboxRepository';
import type { RedisStreamPublisher } from '../EventBus/RedisStreamPublisher';

type DispatcherOptions = {
  batchSize: number;
  intervalMs: number;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class OutboxDispatcher {
  private readonly repository: OutboxRepository;
  private readonly publisher: RedisStreamPublisher;
  private readonly options: DispatcherOptions;

  constructor(repository: OutboxRepository, publisher: RedisStreamPublisher, options: DispatcherOptions) {
    this.repository = repository;
    this.publisher = publisher;
    this.options = options;
  }

  async runOnce(): Promise<number> {
    const messages = await this.repository.pullPending(this.options.batchSize);
    for (const message of messages) {
      try {
        await this.publisher.publish(message);
        await this.repository.markPublished(message.id);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        await this.repository.markPending(message.id, messageText);
      }
    }

    return messages.length;
  }

  async start(): Promise<void> {
    while (true) {
      const processed = await this.runOnce();
      if (processed === 0) {
        await sleep(this.options.intervalMs);
      }
    }
  }
}
