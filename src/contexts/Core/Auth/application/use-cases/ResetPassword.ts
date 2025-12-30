import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';
import { InvalidCredentialsError } from '@/contexts/Core/Auth/domain/errors/InvalidCredentialsError';

export class ResetPassword {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(email: string, token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.searchByEmail(new UserEmail(email));
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordHash = await Bun.password.hash(newPassword);
    user.resetPassword(token, new UserPasswordHash(passwordHash));
    await this.userRepository.save(user);
    await this.eventBus.publish(user.pullDomainEvents());
  }
}
