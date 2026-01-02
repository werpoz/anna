import { describe, it, expect } from 'bun:test';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionTenantId } from '@/contexts/Core/Session/domain/SessionTenantId';
import { SessionPhone } from '@/contexts/Core/Session/domain/SessionPhone';
import { SessionStatus } from '@/contexts/Core/Session/domain/SessionStatus';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

describe('Session value objects', () => {
  it('accepts valid ids', () => {
    const id = new SessionId('11111111-1111-1111-1111-111111111111');
    const tenantId = new SessionTenantId('22222222-2222-2222-2222-222222222222');

    expect(id.value).toBe('11111111-1111-1111-1111-111111111111');
    expect(tenantId.value).toBe('22222222-2222-2222-2222-222222222222');
  });

  it('rejects invalid ids', () => {
    expect(() => new SessionId('bad')).toThrow(InvalidArgumentError);
    expect(() => new SessionTenantId('bad')).toThrow(InvalidArgumentError);
  });

  it('validates session phone', () => {
    const phone = new SessionPhone('+123456789');
    expect(phone.value).toBe('+123456789');
    expect(() => new SessionPhone('   ')).toThrow(InvalidArgumentError);
  });

  it('supports session statuses', () => {
    expect(SessionStatus.pendingQr().value).toBe('pending_qr');
    expect(SessionStatus.connected().value).toBe('connected');
    expect(SessionStatus.disconnected().value).toBe('disconnected');
    expect(SessionStatus.expired().value).toBe('expired');
  });

  it('rejects invalid status', () => {
    expect(() => new SessionStatus('invalid' as any)).toThrow(InvalidArgumentError);
  });
});
