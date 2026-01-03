import type { SessionCommandPublisher } from '@/contexts/Core/Session/application/SessionCommandPublisher';

export type SessionControllerDeps = {
  sessionCommandPublisher: SessionCommandPublisher;
};
