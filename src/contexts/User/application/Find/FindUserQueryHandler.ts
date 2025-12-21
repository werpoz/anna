import type { QueryHandler } from '@/contexts/Shared/domain/QueryHandler';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { UserDoesNotExistError } from '@/contexts/User/domain/UserDoesNotExistError';
import { UserId } from '@/contexts/User/domain/UserId';
import type { UserRepository } from '@/contexts/User/domain/UserRepository';
import { FindUserQuery } from '@/contexts/User/application/Find/FindUserQuery';
import { UserResponse } from '@/contexts/User/application/Find/UserResponse';

@injectable()
export class FindUserQueryHandler implements QueryHandler<FindUserQuery, UserResponse> {
  private readonly repository: UserRepository;

  constructor(@inject(TOKENS.UserRepository) repository: UserRepository) {
    this.repository = repository;
  }

  subscribedTo(): FindUserQuery {
    return new FindUserQuery('');
  }

  async handle(query: FindUserQuery): Promise<UserResponse> {
    const userId = new UserId(query.id);
    const user = await this.repository.search(userId);

    if (!user) {
      throw new UserDoesNotExistError(userId);
    }

    return UserResponse.fromUser(user);
  }
}
