import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { UserDoesNotExistError } from '@/contexts/Core/User/domain/errors/UserDoesNotExistError';
import type { LoginMetadata, TokenResult } from '@/contexts/Core/Auth/application/types';
import { AuthTokensService } from '@/contexts/Core/Auth/application/services/AuthTokensService';

export class IssueTokensForUserId {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokensService: AuthTokensService
  ) {}

  async execute(userId: string, metadata: LoginMetadata = {}): Promise<TokenResult> {
    const user = await this.userRepository.search(new UserId(userId));
    if (!user) {
      throw new UserDoesNotExistError(new UserId(userId));
    }

    if (user.status.value !== 'active') {
      throw new UserNotActiveError(user.id, user.status.value);
    }

    return await this.tokensService.issueTokens(user.id.value, user.email.value, metadata);
  }
}
