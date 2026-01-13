import { Pool } from 'pg';
import { S3Client } from '@aws-sdk/client-s3';
import { env } from '@/contexts/Shared/infrastructure/config/env';

const args = process.argv.slice(2);
const sessionId = args[0];
const databaseUrlArg = args[1];
const purgeAll = sessionId === '--all' || sessionId === 'all';

const isUuid = (value: string): boolean => /^[0-9a-fA-F-]{36}$/.test(value);

const main = async (): Promise<void> => {
  if (!sessionId) {
    console.error('Usage: bun run db:purge-session <session_id> [database_url]');
    console.error('   or: bun run db:purge-session --all [database_url]');
    process.exitCode = 1;
    return;
  }

  if (!purgeAll && !isUuid(sessionId)) {
    console.error('session_id must be a UUID.');
    process.exitCode = 1;
    return;
  }

  const databaseUrl = databaseUrlArg || env.databaseUrl;
  const pool = new Pool({ connectionString: databaseUrl });

  // Initialize S3 Client
  let s3Client: S3Client | null = null;
  if (env.s3Endpoint && env.s3Bucket && env.s3AccessKey && env.s3SecretKey) {
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      s3Client = new S3Client({
        region: env.s3Region,
        endpoint: env.s3Endpoint,
        forcePathStyle: env.s3ForcePathStyle,
        credentials: {
          accessKeyId: env.s3AccessKey,
          secretAccessKey: env.s3SecretKey,
        },
      });
    } catch (e) {
      console.warn('[db:purge-session] Warning: Could not initialize S3 client. Media files will not be deleted.', e);
    }
  }

  const deleteS3Prefix = async (prefix: string) => {
    if (!s3Client || !env.s3Bucket) return;
    const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

    let continuationToken: string | undefined;

    do {
      const listCmd = new ListObjectsV2Command({
        Bucket: env.s3Bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const listData = await s3Client.send(listCmd);
      if (!listData.Contents?.length) break;

      const deleteCmd = new DeleteObjectsCommand({
        Bucket: env.s3Bucket,
        Delete: {
          Objects: listData.Contents.map(({ Key }) => ({ Key })),
        },
      });

      await s3Client.send(deleteCmd);
      console.log(`[db:purge-session] Deleted ${listData.Contents.length} objects from ${prefix}`);
      continuationToken = listData.NextContinuationToken;
    } while (continuationToken);
  };

  try {
    await pool.query('BEGIN');

    if (purgeAll) {
      if (s3Client) {
        console.log('[db:purge-session] Cleaning up all S3 data...');
        // Clean all session data
        await deleteS3Prefix('tenants/');
        // Clean profile pictures
        await deleteS3Prefix('profile-pictures/');
      }

      await pool.query('DELETE FROM session_messages');
      await pool.query('DELETE FROM session_message_reactions');
      await pool.query('DELETE FROM session_message_media');
      await pool.query('DELETE FROM session_chats');
      await pool.query('DELETE FROM session_chat_aliases');
      await pool.query('DELETE FROM session_auth_keys');
      await pool.query('DELETE FROM session_auth_creds');
      await pool.query('DELETE FROM session_contacts');
      await pool.query('DELETE FROM sessions');
      await pool.query('COMMIT');
      console.log('[db:purge-session] ok: all sessions removed');
    } else {
      // Fetch tenantId for the session to construct S3 prefix
      const sessionRes = await pool.query('SELECT tenant_id FROM sessions WHERE id = $1', [sessionId]);
      const tenantId = sessionRes.rows[0]?.tenant_id;

      if (tenantId && s3Client) {
        const prefix = `tenants/${tenantId}/sessions/${sessionId}/`;
        console.log(`[db:purge-session] Cleaning up S3 prefix: ${prefix}`);
        await deleteS3Prefix(prefix);
      } else if (!tenantId) {
        console.warn(`[db:purge-session] Session ${sessionId} not found in DB, skipping specific S3 cleanup (only DB will be purged if partial data exists).`);
      }

      await pool.query('DELETE FROM session_messages WHERE session_id = $1::uuid', [sessionId]);
      await pool.query('DELETE FROM session_message_reactions WHERE session_id = $1::uuid', [sessionId]);
      await pool.query('DELETE FROM session_message_media WHERE session_id = $1::uuid', [sessionId]);
      await pool.query('DELETE FROM session_chats WHERE session_id = $1::uuid', [sessionId]);
      await pool.query('DELETE FROM session_chat_aliases WHERE session_id = $1::uuid', [sessionId]);
      await pool.query('DELETE FROM session_auth_keys WHERE session_id = $1', [sessionId]);
      await pool.query('DELETE FROM session_auth_creds WHERE session_id = $1', [sessionId]);
      await pool.query('DELETE FROM session_contacts WHERE session_id = $1::uuid', [sessionId]);
      await pool.query('DELETE FROM sessions WHERE id = $1::uuid', [sessionId]);
      await pool.query('COMMIT');
      console.log(`[db:purge-session] ok: ${sessionId}`);
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[db:purge-session] failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

await main();
