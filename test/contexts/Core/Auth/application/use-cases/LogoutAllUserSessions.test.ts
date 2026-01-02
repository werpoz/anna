import { describe, it, expect } from 'bun:test';
import { LogoutAllUserSessions } from '@/contexts/Core/Auth/application/use-cases/LogoutAllUserSessions';

describe('LogoutAllUserSessions', () => {
  it('revokes all refresh tokens for the user', async () => {
    const calls: string[] = [];
    const useCase = new LogoutAllUserSessions({
      async revokeAllForUser(userId: string): Promise<void> {
        calls.push(userId);
      },
    } as any);

    await useCase.execute('user-1');

    expect(calls).toEqual(['user-1']);
  });
});
