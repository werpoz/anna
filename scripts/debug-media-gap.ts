import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgres://anna:anna@localhost:5432/anna',
});

async function main() {
    try {
        console.log('Fetching media messages without media records...');
        const res = await pool.query(`
            SELECT m.message_id, m.type, m.raw
            FROM session_messages m
            LEFT JOIN session_message_media mm ON m.message_id = mm.message_id
            WHERE m.type IN ('imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage', 'documentMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'templateMessage')
              AND mm.id IS NULL
            LIMIT 5
        `);

        console.log(`Found ${res.rowCount} orphan media messages.`);

        for (const row of res.rows) {
            console.log('--- Orphan Message ID:', row.message_id, 'Type:', row.type, '---');
            console.log(JSON.stringify(row.raw.message, null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
