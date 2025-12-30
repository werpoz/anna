import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { InvalidCredentialsError } from '@/contexts/Core/Auth/domain/errors/InvalidCredentialsError';
import type { LoginMetadata, TokenResult } from '@/contexts/Core/Auth/application/types';
import { AuthTokensService } from '@/contexts/Core/Auth/application/services/AuthTokensService';

export class LoginUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokensService: AuthTokensService
  ) {}

  async execute(email: string, password: string, metadata: LoginMetadata = {}): Promise<TokenResult> {
    const user = await this.userRepository.searchByEmail(new UserEmail(email));
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (user.status.value !== 'active') {
      throw new UserNotActiveError(user.id, user.status.value);
    }

    const isValid = await Bun.password.verify(password, user.passwordHash.value);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    user.recordLogin(new Date());
    await this.userRepository.save(user);

    return await this.tokensService.issueTokens(user.id.value, user.email.value, metadata);
  }
}
