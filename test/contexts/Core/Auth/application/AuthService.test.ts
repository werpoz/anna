import { describe, it, expect } from 'bun:test';
import { AuthService } from '@/contexts/Core/Auth/application/AuthService';

const tokenResult = {
  accessToken: 'access',
  accessTokenExpiresIn: 1,
  refreshToken: 'refresh',
  refreshTokenExpiresIn: 1,
};

const makeUseCase = <TResult>(result: TResult) => {
  const calls: unknown[][] = [];
  return {
    calls,
    async execute(...args: unknown[]): Promise<TResult> {
      calls.push(args);
      return result;
    },
  };
};

describe('AuthService', () => {
  it('delegates to use cases', async () => {
    const login = makeUseCase(tokenResult);
    const issue = makeUseCase(tokenResult);
    const refresh = makeUseCase(tokenResult);
    const logout = makeUseCase(undefined);
    const resend = makeUseCase(undefined);
    const request = makeUseCase(undefined);
    const reset = makeUseCase(undefined);

    const service = new AuthService(
      login as any,
      issue as any,
      refresh as any,
      logout as any,
      resend as any,
      request as any,
      reset as any
    );

    await service.login('ada@example.com', 'password');
    await service.issueTokensForUserId('user-1');
    await service.refresh('refresh-token');
    await service.logout('refresh-token');
    await service.resendVerification('ada@example.com');
    await service.requestPasswordReset('ada@example.com');
    await service.resetPassword('ada@example.com', 'token', 'new-password');

    expect(login.calls).toHaveLength(1);
    expect(issue.calls).toHaveLength(1);
    expect(refresh.calls).toHaveLength(1);
    expect(logout.calls).toHaveLength(1);
    expect(resend.calls).toHaveLength(1);
    expect(request.calls).toHaveLength(1);
    expect(reset.calls).toHaveLength(1);
  });
});
