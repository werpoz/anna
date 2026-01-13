
import { Pool } from 'pg';

async function checkMedia() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        const client = await pool.connect();

        console.log('🔍 Checking session_message_media table...');
        const mediaCount = await client.query('SELECT COUNT(*) FROM session_message_media');
        console.log(`Total records in session_message_media: ${mediaCount.rows[0].count}`);

        console.log('\n🔍 Checking sample URL to see if it needs update...');
        const sample = await client.query('SELECT url FROM session_message_media LIMIT 1');
        if (sample.rows.length > 0) {
            console.log('Sample URL:', sample.rows[0].url);
            if (sample.rows[0].url.includes('pub-256cdfd5f62e465eb4fdc3e23d6e96dd')) {
                console.log('⚠️  URL uses OLD bucket domain!');
            } else if (sample.rows[0].url.includes('pub-270bbd265a3d458585b7de88ba1de184')) {
                console.log('✅ URL uses NEW bucket domain!');
            } else {
                console.log('❓ URL uses unknown domain');
            }
        } else {
            console.log('No media records found.');
        }

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkMedia();
