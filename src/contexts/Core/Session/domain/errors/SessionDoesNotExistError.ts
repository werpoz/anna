import { SessionId } from '@/contexts/Core/Session/domain/SessionId';

export class SessionDoesNotExistError extends Error {
  constructor(id: SessionId) {
    super(`The session <${id.value}> does not exist`);
  }
}
