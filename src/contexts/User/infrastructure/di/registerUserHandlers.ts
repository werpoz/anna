import { container } from 'tsyringe';
import { TOKENS } from '../../../Shared/infrastructure/di/tokens';
import { CreateUserCommandHandler } from '../../application/Create/CreateUserCommandHandler';
import { FindUserQueryHandler } from '../../application/Find/FindUserQueryHandler';
import { LogUserCreatedOnUserCreated } from '../LogUserCreatedOnUserCreated';

container.register(TOKENS.CommandHandlers, { useClass: CreateUserCommandHandler });
container.register(TOKENS.QueryHandlers, { useClass: FindUserQueryHandler });
container.register(TOKENS.DomainEventSubscribers, { useClass: LogUserCreatedOnUserCreated });
