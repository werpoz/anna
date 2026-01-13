
import { Pool } from 'pg';

async function inspectAssociated() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        console.log('🔍 Inspecting associatedChildMessage content...');
        // Fetch raw content of associatedChildMessage
        const res = await client.query(`
        SELECT message_id, raw 
        FROM session_messages 
        WHERE type = 'associatedChildMessage' 
        LIMIT 3
    `);

        for (const row of res.rows) {
            console.log(`\n--- Message ${row.message_id} ---`);
            console.log(JSON.stringify(row.raw, null, 2));
        }

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectAssociated();
