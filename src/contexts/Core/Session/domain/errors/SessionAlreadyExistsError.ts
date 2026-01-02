import { SessionId } from '@/contexts/Core/Session/domain/SessionId';

export class SessionAlreadyExistsError extends Error {
  constructor(id: SessionId) {
    super(`The session <${id.value}> already exists`);
  }
}
