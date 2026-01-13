import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgres://anna:anna@localhost:5432/anna',
});

async function main() {
    try {
        console.log('Fetching raw structure of imageMessages...');
        const res = await pool.query(`
            SELECT message_id, type, raw 
            FROM session_messages 
            WHERE type IN ('imageMessage', 'videoMessage', 'viewOnceMessage', 'viewOnceMessageV2') 
            LIMIT 10
        `);

        console.log(`Found ${res.rowCount} messages.`);

        for (const row of res.rows) {
            console.log('--- Message ID:', row.message_id, 'Type:', row.type, '---');
            const raw = row.raw;
            const msgContent = raw.message;

            // Log relevant keys to see nesting
            console.log(JSON.stringify(msgContent, null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
