import { AggregateRoot } from '../../Shared/domain/AggregateRoot';
import { UserCreatedDomainEvent } from './UserCreatedDomainEvent';
import { UserEmail } from './UserEmail';
import { UserId } from './UserId';
import { UserName } from './UserName';

export type UserPrimitives = {
  id: string;
  name: string;
  email: string;
};

export class User extends AggregateRoot {
  readonly id: UserId;
  readonly name: UserName;
  readonly email: UserEmail;

  private constructor(id: UserId, name: UserName, email: UserEmail) {
    super();
    this.id = id;
    this.name = name;
    this.email = email;
  }

  static create(params: { id: UserId; name: UserName; email: UserEmail }): User {
    const user = new User(params.id, params.name, params.email);
    user.record(
      new UserCreatedDomainEvent({
        aggregateId: user.id.value,
        name: user.name.value,
        email: user.email.value,
      })
    );
    return user;
  }

  static fromPrimitives(params: UserPrimitives): User {
    return new User(new UserId(params.id), new UserName(params.name), new UserEmail(params.email));
  }

  toPrimitives(): UserPrimitives {
    return {
      id: this.id.value,
      name: this.name.value,
      email: this.email.value,
    };
  }
}
