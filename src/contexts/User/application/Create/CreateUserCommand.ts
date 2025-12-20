import { Command } from '../../../Shared/domain/Command';

export class CreateUserCommand extends Command {
  readonly id: string;
  readonly name: string;
  readonly email: string;

  constructor(id: string, name: string, email: string) {
    super();
    this.id = id;
    this.name = name;
    this.email = email;
  }
}
