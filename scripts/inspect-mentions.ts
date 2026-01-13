
import { Pool } from 'pg';

async function inspectMentions() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        console.log('🔍 Searching for messages with mentions...');
        // Find raw messages where mentionedJid is not empty
        const res = await client.query(`
            SELECT message_id, raw 
            FROM session_messages 
            WHERE raw->'message'->'extendedTextMessage'->'contextInfo'->'mentionedJid' IS NOT NULL 
               OR raw->'message'->'imageMessage'->'contextInfo'->'mentionedJid' IS NOT NULL
            LIMIT 5
        `);

        for (const row of res.rows) {
            console.log(`\n--- Message ${row.message_id} ---`);
            const raw = row.raw;
            // Extract text
            const text = raw.message?.conversation ||
                raw.message?.extendedTextMessage?.text ||
                raw.message?.imageMessage?.caption;

            // Extract mentions
            let mentions = [];
            let context = raw.message?.extendedTextMessage?.contextInfo ||
                raw.message?.imageMessage?.contextInfo;
            if (context && context.mentionedJid) {
                mentions = context.mentionedJid;
            }

            console.log('Text:', JSON.stringify(text));
            console.log('Mentions:', mentions);
        }

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectMentions();
