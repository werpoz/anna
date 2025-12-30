import type { CommandBus } from '@/contexts/Shared/domain/CommandBus';
import type { QueryBus } from '@/contexts/Shared/domain/QueryBus';
import type { AuthService } from '@/contexts/Core/Auth/application/AuthService';

export type UserControllerDeps = {
  commandBus: CommandBus;
  queryBus: QueryBus;
  authService: AuthService;
};
