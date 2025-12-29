import type { CommandHandler } from '@/contexts/Shared/domain/CommandHandler';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { User } from '@/contexts/Core/User/domain/User';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserName } from '@/contexts/Core/User/domain/UserName';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { CreateUserCommand } from '@/contexts/Core/User/application/Create/CreateUserCommand';

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
    return new CreateUserCommand('', '', '', '');
  }

  async handle(command: CreateUserCommand): Promise<void> {
    const passwordHash = await Bun.password.hash(command.password);
    const user = User.create({
      id: new UserId(command.id),
      name: new UserName(command.name),
      email: new UserEmail(command.email),
      passwordHash: new UserPasswordHash(passwordHash),
    });

    await this.repository.save(user);
    await this.eventBus.publish(user.pullDomainEvents());
  }
}
