import type { DeadLetterMessage } from '@/contexts/Shared/infrastructure/DeadLetter/DeadLetterMessage';

export interface DeadLetterRepository {
  add(message: DeadLetterMessage): Promise<void>;
}
