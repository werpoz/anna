import { Command } from '@/contexts/Shared/domain/Command';

export interface CommandBus {
  dispatch(command: Command): Promise<void>;
}
