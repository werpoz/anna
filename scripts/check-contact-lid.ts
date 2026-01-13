
import { Pool } from 'pg';

async function checkLids() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });
    const lids = ['117923158999266@lid', '37130696937535@lid', '84220600971509@lid', '139148786712803@lid'];

    try {
        const client = await pool.connect();

        console.log('🔍 Checking session_contacts for specific LIDs...');

        for (const lid of lids) {
            // Check if this LID exists as a contact_lid
            const asLid = await client.query('SELECT * FROM session_contacts WHERE contact_lid = $1', [lid]);
            if (asLid.rowCount > 0) {
                console.log(`[${lid}] Found in contact_lid column! Name: ${asLid.rows[0].name}`);
            } else {
                console.log(`[${lid}] NOT found in contact_lid column.`);
                // Check if it exists as contact_jid (unlikely for LID but checking)
                const asJid = await client.query('SELECT * FROM session_contacts WHERE contact_jid = $1', [lid]);
                if (asJid.rowCount > 0) {
                    console.log(`[${lid}] Found in contact_jid column! (Weird) Name: ${asLid.rows[0].name}`);
                }
            }
        }

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkLids();
