import type { CommandHandler } from '@/contexts/Shared/domain/CommandHandler';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { User } from '@/contexts/User/domain/User';
import { UserEmail } from '@/contexts/User/domain/UserEmail';
import { UserId } from '@/contexts/User/domain/UserId';
import { UserName } from '@/contexts/User/domain/UserName';
import type { UserRepository } from '@/contexts/User/domain/UserRepository';
import { CreateUserCommand } from '@/contexts/User/application/Create/CreateUserCommand';

@injectable()
export class CreateUserCommandHandler implements CommandHandler<CreateUserCommand> {
  private readonly repository: UserRepository;
  private readonly eventBus: EventBus;

  constructor(
    @inject(TOKENS.UserRepository) repository: UserRepository,
    @inject(TOKENS.EventBus) eventBus: EventBus
  ) {
    this.repository = repository;
    this.eventBus = eventBus;
  }

  subscribedTo(): CreateUserCommand {
    return new CreateUserCommand('', '', '');
  }

  async handle(command: CreateUserCommand): Promise<void> {
    const user = User.create({
      id: new UserId(command.id),
      name: new UserName(command.name),
      email: new UserEmail(command.email),
    });

    await this.repository.save(user);
    await this.eventBus.publish(user.pullDomainEvents());
  }
}
