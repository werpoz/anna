import type { Pool } from 'pg';
import type {
  SessionContactRecord,
  SessionContactRepository,
  SessionContactSummary,
} from '@/contexts/Core/Session/domain/SessionContactRepository';

type SessionContactRow = {
  contact_jid: string;
  contact_lid: string | null;
  phone_number: string | null;
  name: string | null;
  notify: string | null;
  verified_name: string | null;
  img_url: string | null;
  status: string | null;
};

export class PostgresSessionContactRepository implements SessionContactRepository {
  constructor(private readonly pool: Pool) { }

  async upsertMany(records: SessionContactRecord[]): Promise<void> {
    if (!records.length) {
      return;
    }

    // Each record uses 13 parameters, so max ~5000 records per batch
    const BATCH_SIZE = 2000;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await this.upsertBatch(batch);
    }
  }

  private async upsertBatch(records: SessionContactRecord[]): Promise<void> {
    const columns = [
      'id',
      'tenant_id',
      'session_id',
      'contact_jid',
      'contact_lid',
      'phone_number',
      'name',
      'notify',
      'verified_name',
      'img_url',
      'status',
      'created_at',
      'updated_at',
    ];

    const values: Array<unknown> = [];
    const placeholders = records.map((record, index) => {
      const offset = index * columns.length;
      values.push(
        record.id,
        record.tenantId,
        record.sessionId,
        record.contactJid,
        record.contactLid,
        record.phoneNumber,
        record.name,
        record.notify,
        record.verifiedName,
        record.imgUrl,
        record.status,
        record.createdAt,
        record.updatedAt
      );
      const slots = columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`);
      return `(${slots.join(', ')})`;
    });

    await this.pool.query(
      `INSERT INTO session_contacts (${columns.join(', ')})
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (session_id, contact_jid)
       DO UPDATE SET
         contact_lid = COALESCE(EXCLUDED.contact_lid, session_contacts.contact_lid),
         phone_number = COALESCE(EXCLUDED.phone_number, session_contacts.phone_number),
         name = COALESCE(EXCLUDED.name, session_contacts.name),
         notify = COALESCE(EXCLUDED.notify, session_contacts.notify),
         verified_name = COALESCE(EXCLUDED.verified_name, session_contacts.verified_name),
         img_url = COALESCE(EXCLUDED.img_url, session_contacts.img_url),
         status = COALESCE(EXCLUDED.status, session_contacts.status),
         updated_at = EXCLUDED.updated_at`,
      values
    );
  }

  async listByTenant(tenantId: string, sessionId?: string): Promise<SessionContactSummary[]> {
    const params: Array<string> = [tenantId];
    let where = 'tenant_id = $1';
    if (sessionId) {
      params.push(sessionId);
      where += ' AND session_id = $2';
    }

    const result = await this.pool.query<SessionContactRow>(
      `SELECT contact_jid, contact_lid, phone_number, name, notify, verified_name, img_url, status
         FROM session_contacts
        WHERE ${where}
        ORDER BY COALESCE(name, notify, contact_jid) ASC`,
      params
    );

    return result.rows.map((row) => ({
      contactJid: row.contact_jid,
      contactLid: row.contact_lid,
      phoneNumber: row.phone_number,
      name: row.name,
      notify: row.notify,
      verifiedName: row.verified_name,
      imgUrl: row.img_url,
      status: row.status,
    }));
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM session_contacts WHERE session_id = $1', [sessionId]);
  }
}
