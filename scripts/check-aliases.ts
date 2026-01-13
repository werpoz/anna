
import { Pool } from 'pg';

async function checkAliases() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        console.log('🔍 Checking session_chat_aliases table...');
        const count = await client.query('SELECT COUNT(*) FROM session_chat_aliases');
        console.log(`Total records: ${count.rows[0].count}`);

        if (parseInt(count.rows[0].count) > 0) {
            const sample = await client.query('SELECT * FROM session_chat_aliases LIMIT 5');
            console.log('Sample records:', sample.rows);
        }

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAliases();
