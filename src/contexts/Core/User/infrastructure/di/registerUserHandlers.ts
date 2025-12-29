import { container } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { CreateUserCommandHandler } from '@/contexts/Core/User/application/Create/CreateUserCommandHandler';
import { FindUserQueryHandler } from '@/contexts/Core/User/application/Find/FindUserQueryHandler';
import { SendUserVerificationEmailOnUserVerificationTokenIssued } from '@/contexts/Core/User/infrastructure/SendUserVerificationEmailOnUserVerificationTokenIssued';
import { VerifyUserCommandHandler } from '@/contexts/Core/User/application/Verify/VerifyUserCommandHandler';
import { SendUserPasswordResetEmailOnUserPasswordResetRequested } from '@/contexts/Core/User/infrastructure/SendUserPasswordResetEmailOnUserPasswordResetRequested';

container.register(TOKENS.CommandHandlers, { useClass: CreateUserCommandHandler });
container.register(TOKENS.CommandHandlers, { useClass: VerifyUserCommandHandler });
container.register(TOKENS.QueryHandlers, { useClass: FindUserQueryHandler });
container.register(TOKENS.DomainEventSubscribers, { useClass: SendUserVerificationEmailOnUserVerificationTokenIssued });
container.register(TOKENS.DomainEventSubscribers, { useClass: SendUserPasswordResetEmailOnUserPasswordResetRequested });
