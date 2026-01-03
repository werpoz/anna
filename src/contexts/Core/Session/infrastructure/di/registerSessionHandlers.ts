import { container } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { PersistSessionHistoryOnSessionHistorySync } from '@/contexts/Core/Session/infrastructure/PersistSessionHistoryOnSessionHistorySync';
import { PersistSessionMessagesOnSessionMessagesUpsert } from '@/contexts/Core/Session/infrastructure/PersistSessionMessagesOnSessionMessagesUpsert';

container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionHistoryOnSessionHistorySync,
});
container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionMessagesOnSessionMessagesUpsert,
});
