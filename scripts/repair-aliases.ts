
import { Pool } from 'pg';

async function repairAliases() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();
        console.log('🔧 Starting alias repair...');

        // 1. Fetch all contacts that have BOTH JID and LID
        const res = await client.query(`
      SELECT session_id, contact_jid, contact_lid 
      FROM session_contacts 
      WHERE contact_lid IS NOT NULL
    `);

        console.log(`Found ${res.rowCount} contacts with LID linked.`);

        for (const row of res.rows) {
            const { session_id, contact_jid, contact_lid } = row;

            // 2. Resolve chat_key for JID
            const jidRes = await client.query(
                'SELECT chat_key FROM session_chat_aliases WHERE session_id = $1 AND alias = $2',
                [session_id, contact_jid]
            );

            // 3. Resolve chat_key for LID
            const lidRes = await client.query(
                'SELECT chat_key FROM session_chat_aliases WHERE session_id = $1 AND alias = $2',
                [session_id, contact_lid]
            );

            const jidKey = jidRes.rows[0]?.chat_key;
            const lidKey = lidRes.rows[0]?.chat_key;

            if (jidKey && lidKey && jidKey !== lidKey) {
                console.log(`⚠️ Mismatch detected for ${contact_jid} / ${contact_lid}`);
                console.log(`   JID Key: ${jidKey}`);
                console.log(`   LID Key: ${lidKey}`);
                console.log(`   -> Merging LID Key into JID Key...`);

                // 4. Merge: Update all aliases pointing to lidKey to use jidKey
                await client.query(
                    `UPDATE session_chat_aliases 
           SET chat_key = $1, updated_at = NOW() 
           WHERE session_id = $2 AND chat_key = $3`,
                    [jidKey, session_id, lidKey]
                );
                console.log(`   ✅ Merged.`);
            } else if (jidKey && !lidKey) {
                console.log(`⚠️ LID alias missing for ${contact_lid}. Creating link to ${jidKey}...`);
                await client.query(
                    `INSERT INTO session_chat_aliases (id, tenant_id, session_id, chat_key, alias, alias_type, created_at, updated_at)
              SELECT gen_random_uuid(), tenant_id, session_id, $1, $2, 'lid', NOW(), NOW()
              FROM session_chat_aliases WHERE chat_key = $1 LIMIT 1`,
                    [jidKey, contact_lid]
                );
            } else if (!jidKey && lidKey) {
                console.log(`⚠️ JID alias missing for ${contact_jid}. Creating link to ${lidKey}...`);
                await client.query(
                    `INSERT INTO session_chat_aliases (id, tenant_id, session_id, chat_key, alias, alias_type, created_at, updated_at)
              SELECT gen_random_uuid(), tenant_id, session_id, $1, $2, 'jid', NOW(), NOW()
              FROM session_chat_aliases WHERE chat_key = $1 LIMIT 1`,
                    [lidKey, contact_jid]
                );
            }
        }

        console.log('✅ Repair completed.');
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

repairAliases();
