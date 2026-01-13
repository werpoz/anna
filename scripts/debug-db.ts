
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgres://anna:anna@localhost:5432/anna',
});

async function main() {
    try {
        console.log('Testing JOIN with LID support...');
        const joinTest = await pool.query(`
        SELECT sc.chat_jid, 
               con.contact_jid, con.contact_lid,
               con.name as con_name,
               COALESCE(sc.chat_name, con.name, con.verified_name, con.notify) as resolved_name
        FROM session_chats sc
        LEFT JOIN session_contacts con ON sc.session_id = con.session_id 
             AND (sc.chat_jid = con.contact_jid OR sc.chat_jid = con.contact_lid)
        WHERE sc.chat_jid LIKE '%@lid'
        LIMIT 20
    `);
        console.table(joinTest.rows);

    } catch (error) {
        console.error(error);
    } finally {
        await pool.end();
    }
}

main();
