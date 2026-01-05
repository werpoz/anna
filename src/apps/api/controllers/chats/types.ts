import type { SessionChatRepository } from '@/contexts/Core/Session/domain/SessionChatRepository';
import type { SessionMessageRepository } from '@/contexts/Core/Session/domain/SessionMessageRepository';
import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import type { SessionCommandPublisher } from '@/contexts/Core/Session/application/SessionCommandPublisher';
import type { SessionMessageReactionRepository } from '@/contexts/Core/Session/domain/SessionMessageReactionRepository';
import type { SessionMessageMediaRepository } from '@/contexts/Core/Session/domain/SessionMessageMediaRepository';
import type { SessionChatAliasRepository } from '@/contexts/Core/Session/domain/SessionChatAliasRepository';
import type { SessionContactRepository } from '@/contexts/Core/Session/domain/SessionContactRepository';

export type ChatControllerDeps = {
  chatRepository: SessionChatRepository;
  messageRepository: SessionMessageRepository;
  reactionRepository: SessionMessageReactionRepository;
  mediaRepository: SessionMessageMediaRepository;
  chatAliasRepository: SessionChatAliasRepository;
  contactRepository: SessionContactRepository;
  sessionRepository: SessionRepository;
  sessionCommandPublisher: SessionCommandPublisher;
};
