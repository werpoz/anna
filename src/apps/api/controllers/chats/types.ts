import type { SessionChatRepository } from '@/contexts/Core/Session/domain/SessionChatRepository';
import type { SessionMessageRepository } from '@/contexts/Core/Session/domain/SessionMessageRepository';
import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import type { SessionCommandPublisher } from '@/contexts/Core/Session/application/SessionCommandPublisher';
import type { SessionMessageReactionRepository } from '@/contexts/Core/Session/domain/SessionMessageReactionRepository';
import type { SessionMessageMediaRepository } from '@/contexts/Core/Session/domain/SessionMessageMediaRepository';

export type ChatControllerDeps = {
  chatRepository: SessionChatRepository;
  messageRepository: SessionMessageRepository;
  reactionRepository: SessionMessageReactionRepository;
  mediaRepository: SessionMessageMediaRepository;
  sessionRepository: SessionRepository;
  sessionCommandPublisher: SessionCommandPublisher;
};
