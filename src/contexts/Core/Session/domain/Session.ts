import { AggregateRoot } from '@/contexts/Shared/domain/AggregateRoot';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionTenantId } from '@/contexts/Core/Session/domain/SessionTenantId';
import { SessionStatus, type SessionStatusValue } from '@/contexts/Core/Session/domain/SessionStatus';
import { SessionPhone } from '@/contexts/Core/Session/domain/SessionPhone';
import { SessionCreatedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionCreatedDomainEvent';
import { SessionQrUpdatedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionQrUpdatedDomainEvent';
import { SessionConnectedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionConnectedDomainEvent';
import { SessionDisconnectedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionDisconnectedDomainEvent';
import { SessionAlreadyConnectedError } from '@/contexts/Core/Session/domain/errors/SessionAlreadyConnectedError';
import { SessionNotConnectedError } from '@/contexts/Core/Session/domain/errors/SessionNotConnectedError';

export type SessionPrimitives = {
  id: string;
  tenantId: string;
  status: SessionStatusValue;
  phone: string | null;
  qr: string | null;
  qrExpiresAt: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
  disconnectedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export class Session extends AggregateRoot {
  readonly id: SessionId;
  readonly tenantId: SessionTenantId;
  private statusValue: SessionStatus;
  private phoneValue: SessionPhone | null;
  private qrValue: string | null;
  private qrExpiresAtValue: Date | null;
  private connectedAtValue: Date | null;
  private disconnectedAtValue: Date | null;
  private disconnectedReasonValue: string | null;
  private createdAtValue: Date;
  private updatedAtValue: Date;

  private constructor(
    id: SessionId,
    tenantId: SessionTenantId,
    status: SessionStatus,
    phone: SessionPhone | null,
    qr: string | null,
    qrExpiresAt: Date | null,
    connectedAt: Date | null,
    disconnectedAt: Date | null,
    disconnectedReason: string | null,
    createdAt: Date,
    updatedAt: Date
  ) {
    super();
    this.id = id;
    this.tenantId = tenantId;
    this.statusValue = status;
    this.phoneValue = phone;
    this.qrValue = qr;
    this.qrExpiresAtValue = qrExpiresAt;
    this.connectedAtValue = connectedAt;
    this.disconnectedAtValue = disconnectedAt;
    this.disconnectedReasonValue = disconnectedReason;
    this.createdAtValue = createdAt;
    this.updatedAtValue = updatedAt;
  }

  static create(params: { id: SessionId; tenantId: SessionTenantId }): Session {
    const now = new Date();
    const session = new Session(
      params.id,
      params.tenantId,
      SessionStatus.pendingQr(),
      null,
      null,
      null,
      null,
      null,
      null,
      now,
      now
    );
    session.record(
      new SessionCreatedDomainEvent({
        aggregateId: session.id.value,
        tenantId: session.tenantId.value,
        status: session.status.value,
        createdAt: now.toISOString(),
      })
    );
    return session;
  }

  static fromPrimitives(params: SessionPrimitives): Session {
    return new Session(
      new SessionId(params.id),
      new SessionTenantId(params.tenantId),
      new SessionStatus(params.status),
      params.phone ? new SessionPhone(params.phone) : null,
      params.qr,
      params.qrExpiresAt ? new Date(params.qrExpiresAt) : null,
      params.connectedAt ? new Date(params.connectedAt) : null,
      params.disconnectedAt ? new Date(params.disconnectedAt) : null,
      params.disconnectedReason,
      new Date(params.createdAt),
      new Date(params.updatedAt)
    );
  }

  get status(): SessionStatus {
    return this.statusValue;
  }

  get phone(): SessionPhone | null {
    return this.phoneValue;
  }

  get qr(): string | null {
    return this.qrValue;
  }

  get qrExpiresAt(): Date | null {
    return this.qrExpiresAtValue;
  }

  get connectedAt(): Date | null {
    return this.connectedAtValue;
  }

  get disconnectedAt(): Date | null {
    return this.disconnectedAtValue;
  }

  get disconnectedReason(): string | null {
    return this.disconnectedReasonValue;
  }

  get createdAt(): Date {
    return this.createdAtValue;
  }

  get updatedAt(): Date {
    return this.updatedAtValue;
  }

  updateQr(qr: string, expiresAt: Date, updatedAt: Date = new Date()): void {
    if (this.statusValue.value === 'connected') {
      throw new SessionAlreadyConnectedError(this.id);
    }

    this.statusValue = SessionStatus.pendingQr();
    this.qrValue = qr;
    this.qrExpiresAtValue = expiresAt;
    this.updatedAtValue = updatedAt;
    this.record(
      new SessionQrUpdatedDomainEvent({
        aggregateId: this.id.value,
        tenantId: this.tenantId.value,
        qr,
        expiresAt: expiresAt.toISOString(),
      })
    );
  }

  connect(phone: SessionPhone, connectedAt: Date = new Date()): void {
    if (this.statusValue.value === 'connected') {
      throw new SessionAlreadyConnectedError(this.id);
    }

    this.statusValue = SessionStatus.connected();
    this.phoneValue = phone;
    this.connectedAtValue = connectedAt;
    this.updatedAtValue = connectedAt;
    this.qrValue = null;
    this.qrExpiresAtValue = null;
    this.record(
      new SessionConnectedDomainEvent({
        aggregateId: this.id.value,
        tenantId: this.tenantId.value,
        phone: phone.value,
        connectedAt: connectedAt.toISOString(),
      })
    );
  }

  disconnect(reason: string, disconnectedAt: Date = new Date()): void {
    if (this.statusValue.value !== 'connected') {
      throw new SessionNotConnectedError(this.id, this.statusValue.value);
    }

    this.statusValue = SessionStatus.disconnected();
    this.disconnectedAtValue = disconnectedAt;
    this.disconnectedReasonValue = reason;
    this.updatedAtValue = disconnectedAt;
    this.record(
      new SessionDisconnectedDomainEvent({
        aggregateId: this.id.value,
        tenantId: this.tenantId.value,
        reason,
        disconnectedAt: disconnectedAt.toISOString(),
      })
    );
  }

  toPrimitives(): SessionPrimitives {
    return {
      id: this.id.value,
      tenantId: this.tenantId.value,
      status: this.status.value,
      phone: this.phone ? this.phone.value : null,
      qr: this.qr,
      qrExpiresAt: this.qrExpiresAt ? this.qrExpiresAt.toISOString() : null,
      connectedAt: this.connectedAt ? this.connectedAt.toISOString() : null,
      disconnectedAt: this.disconnectedAt ? this.disconnectedAt.toISOString() : null,
      disconnectedReason: this.disconnectedReason,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
