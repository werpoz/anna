
import { Pool } from 'pg';

async function checkHeuristic() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        console.log('🔍 Checking for split aliases with matching timestamps...');

        const res = await client.query(`
      SELECT 
        a1.session_id,
        a1.alias as jid, 
        a2.alias as lid, 
        a1.chat_key as jid_key, 
        a2.chat_key as lid_key,
        a1.created_at
      FROM session_chat_aliases a1
      JOIN session_chat_aliases a2 ON a1.session_id = a2.session_id 
          AND a1.created_at = a2.created_at
      WHERE a1.alias_type = 'jid' 
        AND a2.alias_type = 'lid'
        AND a1.chat_key != a2.chat_key
    `);

        console.log(`Found ${res.rowCount || 0} candidate pairs for heuristic repair.`);
        if ((res.rowCount || 0) > 0) {
            console.log('Sample:', res.rows.slice(0, 3));
        }

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkHeuristic();
