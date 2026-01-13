
import { Pool } from 'pg';

async function checkContacts() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        console.log('🔍 Checking session_contacts table for LID...');
        // Find contacts that have a "lid" (checking if column contact_lid exists and is populated)

        // First check schema slightly by just selecting * limit 1
        const sample = await client.query('SELECT contact_jid, contact_lid FROM session_contacts WHERE contact_lid IS NOT NULL LIMIT 5');
        console.log(`Found ${sample.rowCount} contacts with LID populated:`);
        console.log(sample.rows);

        const count = await client.query('SELECT COUNT(*) FROM session_contacts');
        console.log(`Total records: ${count.rows[0].count}`);

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkContacts();
