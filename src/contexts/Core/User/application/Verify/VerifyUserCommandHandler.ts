import type { CommandHandler } from '@/contexts/Shared/domain/CommandHandler';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserDoesNotExistError } from '@/contexts/Core/User/domain/errors/UserDoesNotExistError';
import { VerifyUserCommand } from '@/contexts/Core/User/application/Verify/VerifyUserCommand';

@injectable()
export class VerifyUserCommandHandler implements CommandHandler<VerifyUserCommand> {
  private readonly repository: UserRepository;
  private readonly eventBus: EventBus;

  constructor(
    @inject(TOKENS.UserRepository) repository: UserRepository,
    @inject(TOKENS.EventBus) eventBus: EventBus
  ) {
    this.repository = repository;
    this.eventBus = eventBus;
  }

  subscribedTo(): VerifyUserCommand {
    return new VerifyUserCommand('', '');
  }

  async handle(command: VerifyUserCommand): Promise<void> {
    const userId = new UserId(command.id);
    const user = await this.repository.search(userId);

    if (!user) {
      throw new UserDoesNotExistError(userId);
    }

    user.verify(command.token);
    await this.repository.save(user);
    await this.eventBus.publish(user.pullDomainEvents());
  }
}
