import type { Pool } from 'pg';
import {
  BufferJSON,
  initAuthCreds,
  type AuthenticationState,
  type SignalKeyStore,
} from 'baileys';

type PostgresAuthSession = {
  sessionId: string;
  tenantId: string;
};

type StoredValue = unknown;

type SessionAuthCredsRow = {
  creds: StoredValue;
};

type SessionAuthKeyRow = {
  key_id: string;
  value: StoredValue;
};

const serialize = (value: unknown): StoredValue => {
  return JSON.parse(JSON.stringify(value, BufferJSON.replacer));
};

const deserialize = <T>(value: StoredValue): T => {
  return JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;
};

export const usePostgresAuthState = async (
  pool: Pool,
  session: PostgresAuthSession
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
  const { sessionId, tenantId } = session;
  const storedCreds = await pool.query<SessionAuthCredsRow>(
    'SELECT creds FROM session_auth_creds WHERE session_id = $1',
    [sessionId]
  );

  let creds = storedCreds.rows[0]?.creds;
  if (!creds) {
    creds = serialize(initAuthCreds());
    await pool.query(
      `INSERT INTO session_auth_creds (session_id, tenant_id, creds)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (session_id)
       DO UPDATE SET creds = EXCLUDED.creds, updated_at = now()`,
      [sessionId, tenantId, JSON.stringify(creds)]
    );
  }

  const keys: SignalKeyStore = {
    get: async (type, ids) => {
      if (!ids.length) {
        return {};
      }

      const result = await pool.query<SessionAuthKeyRow>(
        'SELECT key_id, value FROM session_auth_keys WHERE session_id = $1 AND key_type = $2 AND key_id = ANY($3)',
        [sessionId, type, ids]
      );

      const data: Record<string, unknown> = {};
      for (const row of result.rows) {
        data[row.key_id] = deserialize(row.value);
      }

      return data as any;
    },
    set: async (data) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const [type, entries] of Object.entries(data)) {
          if (!entries) {
            continue;
          }

          for (const [id, value] of Object.entries(entries)) {
            if (value === null || value === undefined) {
              await client.query(
                'DELETE FROM session_auth_keys WHERE session_id = $1 AND key_type = $2 AND key_id = $3',
                [sessionId, type, id]
              );
              continue;
            }

            const payload = JSON.stringify(serialize(value));
            await client.query(
              `INSERT INTO session_auth_keys (session_id, tenant_id, key_type, key_id, value)
               VALUES ($1, $2, $3, $4, $5::jsonb)
               ON CONFLICT (session_id, key_type, key_id)
               DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
              [sessionId, tenantId, type, id, payload]
            );
          }
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };

  const state: AuthenticationState = {
    creds: deserialize(creds),
    keys,
  };

  const saveCreds = async (): Promise<void> => {
    const payload = JSON.stringify(serialize(state.creds));
    await pool.query(
      `INSERT INTO session_auth_creds (session_id, tenant_id, creds)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (session_id)
       DO UPDATE SET creds = EXCLUDED.creds, updated_at = now()`,
      [sessionId, tenantId, payload]
    );
  };

  return { state, saveCreds };
};
