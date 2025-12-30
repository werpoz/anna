import type { AuthService } from '@/contexts/Core/Auth/application/AuthService';

export type AuthControllerDeps = {
  authService: AuthService;
};
