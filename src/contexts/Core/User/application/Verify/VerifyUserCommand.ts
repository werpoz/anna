import { Command } from '@/contexts/Shared/domain/Command';

export class VerifyUserCommand extends Command {
  readonly id: string;
  readonly token: string;

  constructor(id: string, token: string) {
    super();
    this.id = id;
    this.token = token;
  }
}
