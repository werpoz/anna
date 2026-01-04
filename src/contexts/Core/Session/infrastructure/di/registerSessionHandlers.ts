import { container } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { PersistSessionHistoryOnSessionHistorySync } from '@/contexts/Core/Session/infrastructure/PersistSessionHistoryOnSessionHistorySync';
import { PersistSessionMessagesOnSessionMessagesUpsert } from '@/contexts/Core/Session/infrastructure/PersistSessionMessagesOnSessionMessagesUpsert';
import { PersistSessionChatsOnSessionHistorySync } from '@/contexts/Core/Session/infrastructure/PersistSessionChatsOnSessionHistorySync';
import { PersistSessionChatsOnSessionMessagesUpsert } from '@/contexts/Core/Session/infrastructure/PersistSessionChatsOnSessionMessagesUpsert';
import { PersistSessionContactsOnSessionContactsUpsert } from '@/contexts/Core/Session/infrastructure/PersistSessionContactsOnSessionContactsUpsert';
import { PersistSessionMessageStatusOnSessionMessagesUpdate } from '@/contexts/Core/Session/infrastructure/PersistSessionMessageStatusOnSessionMessagesUpdate';
import { PersistSessionMessageEditsOnSessionMessagesEdit } from '@/contexts/Core/Session/infrastructure/PersistSessionMessageEditsOnSessionMessagesEdit';
import { PersistSessionMessageDeletesOnSessionMessagesDelete } from '@/contexts/Core/Session/infrastructure/PersistSessionMessageDeletesOnSessionMessagesDelete';
import { PersistSessionMessageReactionsOnSessionMessagesReaction } from '@/contexts/Core/Session/infrastructure/PersistSessionMessageReactionsOnSessionMessagesReaction';

container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionHistoryOnSessionHistorySync,
});
container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionMessagesOnSessionMessagesUpsert,
});
container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionChatsOnSessionHistorySync,
});
container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionChatsOnSessionMessagesUpsert,
});
container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionContactsOnSessionContactsUpsert,
});
container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionMessageStatusOnSessionMessagesUpdate,
});
container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionMessageEditsOnSessionMessagesEdit,
});
container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionMessageDeletesOnSessionMessagesDelete,
});
container.register(TOKENS.DomainEventSubscribers, {
  useClass: PersistSessionMessageReactionsOnSessionMessagesReaction,
});
