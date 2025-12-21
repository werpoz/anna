import type { DeadLetterMessage } from './DeadLetterMessage';

export interface DeadLetterRepository {
  add(message: DeadLetterMessage): Promise<void>;
}
