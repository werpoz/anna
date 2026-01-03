import type { Pool } from 'pg';
import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import { Session } from '@/contexts/Core/Session/domain/Session';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionTenantId } from '@/contexts/Core/Session/domain/SessionTenantId';
import type { SessionPrimitives } from '@/contexts/Core/Session/domain/Session';

type SessionRow = {
  id: string;
  tenant_id: string;
  status: string;
  phone: string | null;
  qr: string | null;
  qr_expires_at: Date | string | null;
  connected_at: Date | string | null;
  disconnected_at: Date | string | null;
  disconnected_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

const toIsoString = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const mapRowToSession = (row: SessionRow): Session => {
  const primitives: SessionPrimitives = {
    id: row.id,
    tenantId: row.tenant_id,
    status: row.status as SessionPrimitives['status'],
    phone: row.phone,
    qr: row.qr,
    qrExpiresAt: toIsoString(row.qr_expires_at),
    connectedAt: toIsoString(row.connected_at),
    disconnectedAt: toIsoString(row.disconnected_at),
    disconnectedReason: row.disconnected_reason,
    createdAt: toIsoString(row.created_at) as string,
    updatedAt: toIsoString(row.updated_at) as string,
  };

  return Session.fromPrimitives(primitives);
};

export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly pool: Pool) {}

  async save(session: Session): Promise<void> {
    const primitives = session.toPrimitives();
    await this.pool.query(
      `INSERT INTO sessions
        (id, tenant_id, status, phone, qr, qr_expires_at, connected_at, disconnected_at, disconnected_reason,
         created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         phone = EXCLUDED.phone,
         qr = EXCLUDED.qr,
         qr_expires_at = EXCLUDED.qr_expires_at,
         connected_at = EXCLUDED.connected_at,
         disconnected_at = EXCLUDED.disconnected_at,
         disconnected_reason = EXCLUDED.disconnected_reason,
         updated_at = EXCLUDED.updated_at`,
      [
        primitives.id,
        primitives.tenantId,
        primitives.status,
        primitives.phone,
        primitives.qr,
        primitives.qrExpiresAt,
        primitives.connectedAt,
        primitives.disconnectedAt,
        primitives.disconnectedReason,
        primitives.createdAt,
        primitives.updatedAt,
      ]
    );
  }

  async search(id: SessionId): Promise<Session | null> {
    const result = await this.pool.query<SessionRow>(
      `SELECT id, tenant_id, status, phone, qr, qr_expires_at, connected_at, disconnected_at,
              disconnected_reason, created_at, updated_at
         FROM sessions
        WHERE id = $1
        LIMIT 1`,
      [id.value]
    );

    const row = result.rows[0];
    return row ? mapRowToSession(row) : null;
  }

  async searchByTenant(tenantId: SessionTenantId): Promise<Session[]> {
    const result = await this.pool.query<SessionRow>(
      `SELECT id, tenant_id, status, phone, qr, qr_expires_at, connected_at, disconnected_at,
              disconnected_reason, created_at, updated_at
         FROM sessions
        WHERE tenant_id = $1
        ORDER BY created_at DESC`,
      [tenantId.value]
    );

    return result.rows.map(mapRowToSession);
  }

  async delete(id: SessionId): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [id.value]);
  }
}
