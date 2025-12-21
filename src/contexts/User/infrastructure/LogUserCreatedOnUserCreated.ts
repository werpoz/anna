import type Logger from '@/contexts/Shared/domain/Logger';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { UserCreatedDomainEvent } from '@/contexts/User/domain/UserCreatedDomainEvent';

@injectable()
export class LogUserCreatedOnUserCreated implements DomainEventSubscriber<UserCreatedDomainEvent> {
  private readonly logger: Logger;

  constructor(@inject(TOKENS.Logger) logger: Logger) {
    this.logger = logger;
  }

  subscribedTo(): Array<typeof UserCreatedDomainEvent> {
    return [UserCreatedDomainEvent];
  }

  async on(domainEvent: UserCreatedDomainEvent): Promise<void> {
    this.logger.info(
      `[UserCreated] id=${domainEvent.aggregateId} name=${domainEvent.name} email=${domainEvent.email}`
    );
  }
}
