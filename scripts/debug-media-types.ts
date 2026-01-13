
import { Pool } from 'pg';

async function checkMessageTypes() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        console.log('🔍 Checking for messages with type "videoMessage", "imageMessage", "associatedChildMessage"...');

        // Check distribution of types for messages that have NO media linked
        const result = await client.query(`
      SELECT m.type, COUNT(*) 
      FROM session_messages m
      LEFT JOIN session_message_media mm ON m.message_id = mm.message_id
      WHERE mm.message_id IS NULL 
      GROUP BY m.type
      ORDER BY 2 DESC
    `);

        console.log('Types without media:', result.rows);

        // Inspect a sample "videoMessage" that has no media
        const videoSample = await client.query(`
        SELECT m.message_id, m.type, m.raw
        FROM session_messages m
        LEFT JOIN session_message_media mm ON m.message_id = mm.message_id
        WHERE m.type = 'videoMessage' AND mm.message_id IS NULL
        LIMIT 1
    `);

        if (videoSample.rows.length) {
            console.log('Sample videoMessage without media RAW:', JSON.stringify(videoSample.rows[0].raw, null, 2));
        }

        // Inspect sample "imageMessage" without media
        const imageSample = await client.query(`
        SELECT m.message_id, m.type, m.raw
        FROM session_messages m
        LEFT JOIN session_message_media mm ON m.message_id = mm.message_id
        WHERE m.type = 'imageMessage' AND mm.message_id IS NULL
        LIMIT 1
    `);

        if (imageSample.rows.length) {
            console.log('Sample imageMessage without media RAW:', JSON.stringify(imageSample.rows[0].raw, null, 2));
        }

        // Inspect specific types metioned by user if they exist in DB
        const weirdTypes = await client.query(`
        SELECT type, raw FROM session_messages 
        WHERE type IN ('associatedChildMessage', 'viewOnceMessage', 'viewOnceMessageV2') 
        LIMIT 2
    `);
        console.log('Weird types samples:', weirdTypes.rows);

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkMessageTypes();
