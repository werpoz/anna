import { describe, it, expect } from 'bun:test';
import { Session } from '@/contexts/Core/Session/domain/Session';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionTenantId } from '@/contexts/Core/Session/domain/SessionTenantId';
import { SessionPhone } from '@/contexts/Core/Session/domain/SessionPhone';
import { SessionAlreadyConnectedError } from '@/contexts/Core/Session/domain/errors/SessionAlreadyConnectedError';
import { SessionNotConnectedError } from '@/contexts/Core/Session/domain/errors/SessionNotConnectedError';
import { SessionCreatedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionCreatedDomainEvent';
import { SessionQrUpdatedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionQrUpdatedDomainEvent';
import { SessionConnectedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionConnectedDomainEvent';
import { SessionDisconnectedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionDisconnectedDomainEvent';

const buildSession = (): Session =>
  Session.create({
    id: new SessionId('11111111-1111-1111-1111-111111111111'),
    tenantId: new SessionTenantId('22222222-2222-2222-2222-222222222222'),
  });

describe('Session', () => {
  it('creates a session and records event', () => {
    const session = buildSession();
    const events = session.pullDomainEvents();

    expect(session.status.value).toBe('pending_qr');
    expect(events[0]).toBeInstanceOf(SessionCreatedDomainEvent);
  });

  it('updates QR and records event', () => {
    const session = buildSession();
    session.pullDomainEvents();

    const expiresAt = new Date('2024-01-01T00:10:00.000Z');
    session.updateQr('qr-value', expiresAt);
    const events = session.pullDomainEvents();

    expect(session.qr).toBe('qr-value');
    expect(session.qrExpiresAt?.toISOString()).toBe(expiresAt.toISOString());
    expect(events[0]).toBeInstanceOf(SessionQrUpdatedDomainEvent);
  });

  it('connects a session and records event', () => {
    const session = buildSession();
    session.updateQr('qr', new Date('2024-01-01T00:10:00.000Z'));
    session.pullDomainEvents();

    const phone = new SessionPhone('+123');
    session.connect(phone, new Date('2024-01-01T00:20:00.000Z'));
    const events = session.pullDomainEvents();

    expect(session.status.value).toBe('connected');
    expect(session.phone?.value).toBe('+123');
    expect(session.qr).toBeNull();
    expect(events[0]).toBeInstanceOf(SessionConnectedDomainEvent);
  });

  it('throws when connecting twice', () => {
    const session = buildSession();
    session.connect(new SessionPhone('+123'));

    expect(() => session.connect(new SessionPhone('+123'))).toThrow(SessionAlreadyConnectedError);
  });

  it('disconnects a session and records event', () => {
    const session = buildSession();
    session.connect(new SessionPhone('+123'));
    session.pullDomainEvents();

    session.disconnect('logout', new Date('2024-01-01T00:30:00.000Z'));
    const events = session.pullDomainEvents();

    expect(session.status.value).toBe('disconnected');
    expect(session.disconnectedReason).toBe('logout');
    expect(events[0]).toBeInstanceOf(SessionDisconnectedDomainEvent);
  });

  it('throws when disconnecting without connection', () => {
    const session = buildSession();

    expect(() => session.disconnect('lost')).toThrow(SessionNotConnectedError);
  });

  it('round-trips primitives', () => {
    const session = buildSession();
    session.updateQr('qr', new Date('2024-01-01T00:10:00.000Z'));
    session.connect(new SessionPhone('+123'), new Date('2024-01-01T00:20:00.000Z'));
    session.disconnect('lost', new Date('2024-01-01T00:30:00.000Z'));

    const rebuilt = Session.fromPrimitives(session.toPrimitives());

    expect(rebuilt.id.value).toBe(session.id.value);
    expect(rebuilt.tenantId.value).toBe(session.tenantId.value);
    expect(rebuilt.status.value).toBe(session.status.value);
    expect(rebuilt.phone?.value).toBe(session.phone?.value);
  });
});
