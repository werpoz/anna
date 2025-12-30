import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';

export class RequestPasswordReset {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
    private readonly ttlMs: number
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.searchByEmail(new UserEmail(email));
    if (!user) {
      return;
    }

    user.requestPasswordReset(this.ttlMs);
    await this.userRepository.save(user);
    await this.eventBus.publish(user.pullDomainEvents());
  }
}
