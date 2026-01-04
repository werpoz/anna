import type { SessionCommandPublisher } from '@/contexts/Core/Session/application/SessionCommandPublisher';
import type { SessionMessageRepository } from '@/contexts/Core/Session/domain/SessionMessageRepository';

export type SessionControllerDeps = {
  sessionCommandPublisher: SessionCommandPublisher;
  messageRepository?: SessionMessageRepository;
};
