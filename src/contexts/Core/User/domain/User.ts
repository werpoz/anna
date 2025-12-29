import { AggregateRoot } from '@/contexts/Shared/domain/AggregateRoot';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserName } from '@/contexts/Core/User/domain/UserName';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserRegisteredDomainEvent } from '@/contexts/Core/User/domain/events/UserRegisteredDomainEvent';
import { UserVerificationTokenIssuedDomainEvent } from '@/contexts/Core/User/domain/events/UserVerificationTokenIssuedDomainEvent';
import { UserStatus, type UserStatusValue } from '@/contexts/Core/User/domain/UserStatus';
import { UserVerificationToken } from '@/contexts/Core/User/domain/UserVerificationToken';
import { UserPasswordResetToken } from '@/contexts/Core/User/domain/UserPasswordResetToken';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';
import { UserAlreadyVerifiedError } from '@/contexts/Core/User/domain/errors/UserAlreadyVerifiedError';
import { UserVerificationTokenDoesNotMatchError } from '@/contexts/Core/User/domain/errors/UserVerificationTokenDoesNotMatchError';
import { UserVerificationTokenExpiredError } from '@/contexts/Core/User/domain/errors/UserVerificationTokenExpiredError';
import { UserVerifiedDomainEvent } from '@/contexts/Core/User/domain/events/UserVerifiedDomainEvent';
import { UserVerificationNotPendingError } from '@/contexts/Core/User/domain/errors/UserVerificationNotPendingError';
import { UserPasswordResetNotRequestedError } from '@/contexts/Core/User/domain/errors/UserPasswordResetNotRequestedError';
import { UserPasswordResetTokenDoesNotMatchError } from '@/contexts/Core/User/domain/errors/UserPasswordResetTokenDoesNotMatchError';
import { UserPasswordResetTokenExpiredError } from '@/contexts/Core/User/domain/errors/UserPasswordResetTokenExpiredError';
import { UserPasswordResetRequestedDomainEvent } from '@/contexts/Core/User/domain/events/UserPasswordResetRequestedDomainEvent';
import { UserPasswordResetCompletedDomainEvent } from '@/contexts/Core/User/domain/events/UserPasswordResetCompletedDomainEvent';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';


export type UserPrimitives = {
  id: string;
  name: string;
  email: string;
  status: UserStatusValue;
  passwordHash: string;
  verificationToken: string;
  verificationCode?: string;
  verificationTokenExpiresAt: string;
  verifiedAt: string | null;
  passwordResetToken: string | null;
  passwordResetTokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export class User extends AggregateRoot {
  readonly id: UserId;
  readonly name: UserName;
  readonly email: UserEmail;
  private passwordHashValue: UserPasswordHash;
  private statusValue: UserStatus;
  private verificationTokenValue: UserVerificationToken;
  private verifiedAtValue: Date | null;
  private passwordResetTokenValue: UserPasswordResetToken | null;
  private createdAtValue: Date;
  private updatedAtValue: Date;
  private lastLoginAtValue: Date | null;

  private constructor(
    id: UserId,
    name: UserName,
    email: UserEmail,
    passwordHash: UserPasswordHash,
    status: UserStatus,
    verificationToken: UserVerificationToken,
    verifiedAt: Date | null,
    passwordResetToken: UserPasswordResetToken | null,
    createdAt: Date,
    updatedAt: Date,
    lastLoginAt: Date | null
  ) {
    super();
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHashValue = passwordHash;
    this.statusValue = status;
    this.verificationTokenValue = verificationToken;
    this.verifiedAtValue = verifiedAt;
    this.passwordResetTokenValue = passwordResetToken;
    this.createdAtValue = createdAt;
    this.updatedAtValue = updatedAt;
    this.lastLoginAtValue = lastLoginAt;
  }

  static create(params: {
    id: UserId;
    name: UserName;
    email: UserEmail;
    passwordHash: UserPasswordHash;
    verificationToken?: UserVerificationToken;
  }): User {
    const status = UserStatus.pendingVerification();
    const verificationToken = params.verificationToken ?? UserVerificationToken.random();
    const now = new Date();
    const user = new User(
      params.id,
      params.name,
      params.email,
      params.passwordHash,
      status,
      verificationToken,
      null,
      null,
      now,
      now,
      null
    );
    user.record(
      new UserRegisteredDomainEvent({
        aggregateId: user.id.value,
        name: user.name.value,
        email: user.email.value,
        status: user.status.value,
        verificationToken: user.verificationToken.value,
        verificationCode: user.verificationToken.code,
        verificationTokenExpiresAt: user.verificationToken.expiresAt.toISOString(),
      })
    );
    user.record(
      new UserVerificationTokenIssuedDomainEvent({
        aggregateId: user.id.value,
        email: user.email.value,
        verificationToken: user.verificationToken.value,
        verificationCode: user.verificationToken.code,
        verificationTokenExpiresAt: user.verificationToken.expiresAt.toISOString(),
        reason: 'register',
      })
    );
    return user;
  }

  static fromPrimitives(params: UserPrimitives): User {
    return new User(
      new UserId(params.id),
      new UserName(params.name),
      new UserEmail(params.email),
      new UserPasswordHash(params.passwordHash),
      new UserStatus(params.status),
      new UserVerificationToken(
        params.verificationToken,
        new Date(params.verificationTokenExpiresAt),
        params.verificationCode ?? params.verificationToken
      ),
      params.verifiedAt ? new Date(params.verifiedAt) : null,
      params.passwordResetToken && params.passwordResetTokenExpiresAt
        ? new UserPasswordResetToken(params.passwordResetToken, new Date(params.passwordResetTokenExpiresAt))
        : null,
      new Date(params.createdAt),
      new Date(params.updatedAt),
      params.lastLoginAt ? new Date(params.lastLoginAt) : null
    );
  }

  get status(): UserStatus {
    return this.statusValue;
  }

  get passwordHash(): UserPasswordHash {
    return this.passwordHashValue;
  }

  get verificationToken(): UserVerificationToken {
    return this.verificationTokenValue;
  }

  get verifiedAt(): Date | null {
    return this.verifiedAtValue;
  }

  get passwordResetToken(): UserPasswordResetToken | null {
    return this.passwordResetTokenValue;
  }

  get createdAt(): Date {
    return this.createdAtValue;
  }

  get updatedAt(): Date {
    return this.updatedAtValue;
  }

  get lastLoginAt(): Date | null {
    return this.lastLoginAtValue;
  }

  recordLogin(at: Date = new Date()): void {
    this.lastLoginAtValue = at;
    this.updatedAtValue = at;
  }

  resendVerificationToken(): void {
    if (this.statusValue.value !== 'pending_verification') {
      throw new UserVerificationNotPendingError(this.id, this.statusValue.value);
    }

    this.verificationTokenValue = UserVerificationToken.random();
    this.updatedAtValue = new Date();
    this.record(
      new UserVerificationTokenIssuedDomainEvent({
        aggregateId: this.id.value,
        email: this.email.value,
        verificationToken: this.verificationToken.value,
        verificationCode: this.verificationToken.code,
        verificationTokenExpiresAt: this.verificationToken.expiresAt.toISOString(),
        reason: 'resend',
      })
    );
  }

  requestPasswordReset(ttlMs?: number): void {
    if (this.statusValue.value !== 'active') {
      throw new UserNotActiveError(this.id, this.statusValue.value);
    }

    const token = UserPasswordResetToken.randomWithTtl(ttlMs);
    this.passwordResetTokenValue = token;
    this.updatedAtValue = new Date();
    this.record(
      new UserPasswordResetRequestedDomainEvent({
        aggregateId: this.id.value,
        email: this.email.value,
        resetToken: token.value,
        resetTokenExpiresAt: token.expiresAt.toISOString(),
      })
    );
  }

  resetPassword(token: string, passwordHash: UserPasswordHash, resetAt: Date = new Date()): void {
    if (!this.passwordResetTokenValue) {
      throw new UserPasswordResetNotRequestedError(this.id);
    }

    if (this.passwordResetTokenValue.value !== token) {
      throw new UserPasswordResetTokenDoesNotMatchError(this.id);
    }

    if (this.passwordResetTokenValue.isExpired(resetAt)) {
      throw new UserPasswordResetTokenExpiredError(this.id, this.passwordResetTokenValue.expiresAt);
    }

    this.passwordHashValue = passwordHash;
    this.passwordResetTokenValue = null;
    this.updatedAtValue = resetAt;
    this.record(
      new UserPasswordResetCompletedDomainEvent({
        aggregateId: this.id.value,
        email: this.email.value,
        resetAt: resetAt.toISOString(),
      })
    );
  }

  verify(token: string, verifiedAt: Date = new Date()): void {
    if (this.statusValue.value !== 'pending_verification') {
      if (this.statusValue.value === 'active') {
        throw new UserAlreadyVerifiedError(this.id);
      }
      throw new UserVerificationNotPendingError(this.id, this.statusValue.value);
    }

    if (!this.verificationTokenValue.matches(token)) {
      throw new UserVerificationTokenDoesNotMatchError(this.id);
    }

    if (this.verificationTokenValue.isExpired(verifiedAt)) {
      throw new UserVerificationTokenExpiredError(this.id, this.verificationTokenValue.expiresAt);
    }

    this.statusValue = UserStatus.active();
    this.verifiedAtValue = verifiedAt;
    this.updatedAtValue = verifiedAt;
    this.passwordResetTokenValue = null;
    this.record(
      new UserVerifiedDomainEvent({
        aggregateId: this.id.value,
        email: this.email.value,
        verifiedAt: verifiedAt.toISOString(),
      })
    );
  }

  toPrimitives(): UserPrimitives {
    return {
      id: this.id.value,
      name: this.name.value,
      email: this.email.value,
      status: this.status.value,
      passwordHash: this.passwordHash.value,
      verificationToken: this.verificationToken.value,
      verificationCode: this.verificationToken.code,
      verificationTokenExpiresAt: this.verificationToken.expiresAt.toISOString(),
      verifiedAt: this.verifiedAt ? this.verifiedAt.toISOString() : null,
      passwordResetToken: this.passwordResetToken ? this.passwordResetToken.value : null,
      passwordResetTokenExpiresAt: this.passwordResetToken
        ? this.passwordResetToken.expiresAt.toISOString()
        : null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      lastLoginAt: this.lastLoginAt ? this.lastLoginAt.toISOString() : null,
    };
  }
}
