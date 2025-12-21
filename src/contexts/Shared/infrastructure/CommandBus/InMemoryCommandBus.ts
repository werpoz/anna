import type { CommandBus } from '@/contexts/Shared/domain/CommandBus';
import { Command } from '@/contexts/Shared/domain/Command';
import type { CommandHandler } from '@/contexts/Shared/domain/CommandHandler';
import { CommandNotRegisteredError } from '@/contexts/Shared/domain/CommandNotRegisteredError';

export class InMemoryCommandBus implements CommandBus {
  private readonly handlers: Map<string, CommandHandler<Command>>;

  constructor(handlers: Array<CommandHandler<Command>> = []) {
    this.handlers = new Map();
    this.registerHandlers(handlers);
  }

  async dispatch(command: Command): Promise<void> {
    const commandName = command.constructor.name;
    const handler = this.handlers.get(commandName);

    if (!handler) {
      throw new CommandNotRegisteredError(command);
    }

    await handler.handle(command);
  }

  private registerHandlers(handlers: Array<CommandHandler<Command>>): void {
    handlers.forEach((handler) => {
      const commandName = handler.subscribedTo().constructor.name;
      this.handlers.set(commandName, handler);
    });
  }
}
