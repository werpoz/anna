import { describe, it, expect } from 'bun:test';
import { InMemoryCommandBus } from '@/contexts/Shared/infrastructure/CommandBus/InMemoryCommandBus';
import { Command } from '@/contexts/Shared/domain/Command';
import type { CommandHandler } from '@/contexts/Shared/domain/CommandHandler';
import { CommandNotRegisteredError } from '@/contexts/Shared/domain/CommandNotRegisteredError';

class TestCommand extends Command {
  constructor(readonly value: string) {
    super();
  }
}

class TestHandler implements CommandHandler<TestCommand> {
  public handled: TestCommand | null = null;

  subscribedTo(): Command {
    return new TestCommand('');
  }

  async handle(command: TestCommand): Promise<void> {
    this.handled = command;
  }
}

describe('InMemoryCommandBus', () => {
  it('dispatches to handler', async () => {
    const handler = new TestHandler();
    const bus = new InMemoryCommandBus([handler]);

    const command = new TestCommand('hello');
    await bus.dispatch(command);

    expect(handler.handled).toBe(command);
  });

  it('throws when no handler', async () => {
    const bus = new InMemoryCommandBus([]);
    await expect(bus.dispatch(new TestCommand('x'))).rejects.toThrow(CommandNotRegisteredError);
  });
});
