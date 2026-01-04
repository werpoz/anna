import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';

export type MediaControllerDeps = {
  sessionRepository: SessionRepository;
};
