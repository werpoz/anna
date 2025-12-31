import { describe, it, expect } from 'bun:test';
import { UserRegisteredDomainEvent } from '@/contexts/Core/User/domain/events/UserRegisteredDomainEvent';
import { UserVerificationTokenIssuedDomainEvent } from '@/contexts/Core/User/domain/events/UserVerificationTokenIssuedDomainEvent';
import { UserVerifiedDomainEvent } from '@/contexts/Core/User/domain/events/UserVerifiedDomainEvent';
import { UserPasswordResetRequestedDomainEvent } from '@/contexts/Core/User/domain/events/UserPasswordResetRequestedDomainEvent';
import { UserPasswordResetCompletedDomainEvent } from '@/contexts/Core/User/domain/events/UserPasswordResetCompletedDomainEvent';


describe('User domain events', () => {
  it('round-trips user registered', () => {
    const event = new UserRegisteredDomainEvent({
      aggregateId: '11111111-1111-1111-1111-111111111111',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      status: 'pending_verification',
      verificationToken: 'token',
      verificationCode: 'code',
      verificationTokenExpiresAt: '2024-01-01T00:00:00.000Z',
    });

    const primitives = event.toPrimitives();
    const restored = UserRegisteredDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: primitives,
    });

    expect(restored.eventName).toBe('user.registered');
    expect(restored.email).toBe(event.email);
    expect(restored.verificationCode).toBe('code');
  });

  it('round-trips verification token issued', () => {
    const event = new UserVerificationTokenIssuedDomainEvent({
      aggregateId: '11111111-1111-1111-1111-111111111111',
      email: 'ada@example.com',
      verificationToken: 'token',
      verificationCode: 'code',
      verificationTokenExpiresAt: '2024-01-01T00:00:00.000Z',
      reason: 'register',
    });

    const primitives = event.toPrimitives();
    const restored = UserVerificationTokenIssuedDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: primitives,
    });

    expect(restored.eventName).toBe('user.verification.token_issued');
    expect(restored.reason).toBe('register');
    expect(restored.verificationCode).toBe('code');
  });

  it('round-trips user verified', () => {
    const event = new UserVerifiedDomainEvent({
      aggregateId: '11111111-1111-1111-1111-111111111111',
      email: 'ada@example.com',
      verifiedAt: '2024-01-01T00:00:00.000Z',
    });

    const primitives = event.toPrimitives();
    const restored = UserVerifiedDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: primitives,
    });

    expect(restored.eventName).toBe('user.verified');
    expect(restored.verifiedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('round-trips password reset requested', () => {
    const event = new UserPasswordResetRequestedDomainEvent({
      aggregateId: '11111111-1111-1111-1111-111111111111',
      email: 'ada@example.com',
      resetToken: 'reset-token',
      resetTokenExpiresAt: '2024-01-01T00:00:00.000Z',
    });

    const primitives = event.toPrimitives();
    const restored = UserPasswordResetRequestedDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: primitives,
    });

    expect(restored.eventName).toBe('user.password_reset.requested');
    expect(restored.resetToken).toBe('reset-token');
  });

  it('round-trips password reset completed', () => {
    const event = new UserPasswordResetCompletedDomainEvent({
      aggregateId: '11111111-1111-1111-1111-111111111111',
      email: 'ada@example.com',
      resetAt: '2024-01-01T00:00:00.000Z',
    });

    const primitives = event.toPrimitives();
    const restored = UserPasswordResetCompletedDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: primitives,
    });

    expect(restored.eventName).toBe('user.password_reset.completed');
    expect(restored.resetAt).toBe('2024-01-01T00:00:00.000Z');
  });
});
