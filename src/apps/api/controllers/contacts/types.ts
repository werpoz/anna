import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import type { SessionContactRepository } from '@/contexts/Core/Session/domain/SessionContactRepository';

export type ContactControllerDeps = {
  sessionRepository: SessionRepository;
  contactRepository: SessionContactRepository;
};
