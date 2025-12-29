import { Command } from '@/contexts/Shared/domain/Command';

export class CreateUserCommand extends Command {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly password: string;

  constructor(id: string, name: string, email: string, password: string) {
    super();
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
  }
}
