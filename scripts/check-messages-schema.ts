
import { Pool } from 'pg';

async function checkMessagesSchema() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        console.log('🔍 Checking session_messages columns...');
        const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'session_messages'
    `);

        console.log(result.rows.map(r => r.column_name));

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkMessagesSchema();
