import { Command } from '@/contexts/Shared/domain/Command';

export interface CommandHandler<T extends Command> {
  subscribedTo(): Command;
  handle(command: T): Promise<void>;
}
