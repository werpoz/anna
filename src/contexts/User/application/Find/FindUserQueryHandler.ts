import type { QueryHandler } from '../../../Shared/domain/QueryHandler';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../../Shared/infrastructure/di/tokens';
import { UserDoesNotExistError } from '../../domain/UserDoesNotExistError';
import { UserId } from '../../domain/UserId';
import type { UserRepository } from '../../domain/UserRepository';
import { FindUserQuery } from './FindUserQuery';
import { UserResponse } from './UserResponse';

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
