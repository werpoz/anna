import { container } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { CreateUserCommandHandler } from '@/contexts/User/application/Create/CreateUserCommandHandler';
import { FindUserQueryHandler } from '@/contexts/User/application/Find/FindUserQueryHandler';
import { LogUserCreatedOnUserCreated } from '@/contexts/User/infrastructure/LogUserCreatedOnUserCreated';

container.register(TOKENS.CommandHandlers, { useClass: CreateUserCommandHandler });
container.register(TOKENS.QueryHandlers, { useClass: FindUserQueryHandler });
container.register(TOKENS.DomainEventSubscribers, { useClass: LogUserCreatedOnUserCreated });
