
import { Pool } from 'pg';

async function checkMedia() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        console.log('🔍 Checking session_messages_media table...');
        const mediaCount = await client.query('SELECT COUNT(*) FROM session_messages_media');
        console.log(`Total records in session_messages_media: ${mediaCount.rows[0].count}`);

        console.log('\n🔍 Checking recent messages with type=imageMessage...');
        const recentImages = await client.query(`
        SELECT message_id, type, timestamp 
        FROM session_messages 
        WHERE type = 'imageMessage' 
        ORDER BY timestamp DESC 
        LIMIT 5
    `);

        const count = recentImages.rowCount || 0;
        console.log(`Found ${count} recent image messages`);

        if (count > 0) {
            for (const msg of recentImages.rows) {
                const media = await client.query(`
            SELECT * FROM session_messages_media WHERE message_id = $1
        `, [msg.message_id]);

                console.log(`\nMessage ID: ${msg.message_id}`);
                const mediaRowCount = media.rowCount || 0;
                console.log(`Has linked media? ${mediaRowCount > 0 ? 'YES ✅' : 'NO ❌'}`);
                if (mediaRowCount > 0) {
                    console.log('Media URL:', media.rows[0].url);
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

checkMedia();
