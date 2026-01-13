
import { Pool } from 'pg';

async function verifySpecificContact() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();
        const jid = '51921763626@s.whatsapp.net';

        console.log(`🔍 Checking contact record for ${jid}...`);
        const res = await client.query('SELECT * FROM session_contacts WHERE contact_jid = $1', [jid]);
        console.log(res.rows);

        console.log(`🔍 Checking alias records for ${jid}...`);
        const aliasRes = await client.query('SELECT * FROM session_chat_aliases WHERE alias = $1', [jid]);
        console.log(aliasRes.rows);

        if (res.rows.length > 0 && res.rows[0].contact_lid) {
            const lid = res.rows[0].contact_lid;
            console.log(`🔍 Checking alias records for LID ${lid}...`);
            const lidAliasRes = await client.query('SELECT * FROM session_chat_aliases WHERE alias = $1', [lid]);
            console.log(lidAliasRes.rows);
        }

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifySpecificContact();
