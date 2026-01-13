
import { Pool } from 'pg';

async function checkFull() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });
    const lid = '117923158999266@lid';

    try {
        const client = await pool.connect();
        console.log(`🔍 inspecting ${lid} in contacts...`);

        const res = await client.query('SELECT * FROM session_contacts WHERE contact_jid = $1 OR contact_lid = $1', [lid]);
        if ((res.rowCount || 0) > 0) {
            console.log(res.rows[0]);
        }

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkFull();
