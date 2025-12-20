import type { CommandHandler } from '../../../Shared/domain/CommandHandler';
import type { EventBus } from '../../../Shared/domain/EventBus';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../../Shared/infrastructure/di/tokens';
import { User } from '../../domain/User';
import { UserEmail } from '../../domain/UserEmail';
import { UserId } from '../../domain/UserId';
import { UserName } from '../../domain/UserName';
import type { UserRepository } from '../../domain/UserRepository';
import { CreateUserCommand } from './CreateUserCommand';

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
