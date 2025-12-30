import type { LoginMetadata, TokenResult } from '@/contexts/Core/Auth/application/types';
import { LoginUser } from '@/contexts/Core/Auth/application/use-cases/LoginUser';
import { IssueTokensForUserId } from '@/contexts/Core/Auth/application/use-cases/IssueTokensForUserId';
import { RefreshSession } from '@/contexts/Core/Auth/application/use-cases/RefreshSession';
import { LogoutUser } from '@/contexts/Core/Auth/application/use-cases/LogoutUser';
import { ResendVerification } from '@/contexts/Core/Auth/application/use-cases/ResendVerification';
import { RequestPasswordReset } from '@/contexts/Core/Auth/application/use-cases/RequestPasswordReset';
import { ResetPassword } from '@/contexts/Core/Auth/application/use-cases/ResetPassword';

export class AuthService {
  constructor(
    private readonly loginUser: LoginUser,
    private readonly issueTokensForUserIdUseCase: IssueTokensForUserId,
    private readonly refreshSession: RefreshSession,
    private readonly logoutUser: LogoutUser,
    private readonly resendVerificationUseCase: ResendVerification,
    private readonly requestPasswordResetUseCase: RequestPasswordReset,
    private readonly resetPasswordUseCase: ResetPassword
  ) {}

  async login(email: string, password: string, metadata: LoginMetadata = {}): Promise<TokenResult> {
    return await this.loginUser.execute(email, password, metadata);
  }

  async issueTokensForUserId(userId: string, metadata: LoginMetadata = {}): Promise<TokenResult> {
    return await this.issueTokensForUserIdUseCase.execute(userId, metadata);
  }

  async refresh(refreshToken: string, metadata: LoginMetadata = {}): Promise<TokenResult> {
    return await this.refreshSession.execute(refreshToken, metadata);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.logoutUser.execute(refreshToken);
  }

  async resendVerification(email: string): Promise<void> {
    await this.resendVerificationUseCase.execute(email);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.requestPasswordResetUseCase.execute(email);
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    await this.resetPasswordUseCase.execute(email, token, newPassword);
  }
}
