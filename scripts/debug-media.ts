import { Pool } from 'pg';
import '../src/contexts/Shared/infrastructure/config/env'; // Ensure env is loaded

// Manually load env if needed, or rely on bun's auto-load if .env is present
// Assuming bun runs this, it enters via -r or auto detection.

const pool = new Pool({
    connectionString: 'postgres://anna:anna@localhost:5432/anna',
});

async function checkMedia() {
    try {
        console.log('Checking session_message_media table...');
        const res = await pool.query('SELECT count(*) FROM session_message_media');
        console.log('Total media records:', res.rows[0].count);

        if (parseInt(res.rows[0].count) > 0) {
            const sample = await pool.query('SELECT * FROM session_message_media LIMIT 5');
            console.log('Sample media records:', sample.rows);
        } else {
            console.log('No media records found. Ingestion might be failing.');
        }

        console.log('Checking session_messages for media types...');
        const msgRes = await pool.query("SELECT * FROM session_messages WHERE type IN ('imageMessage', 'videoMessage') LIMIT 5");
        console.log('Sample media messages:', msgRes.rows.map(r => ({ id: r.message_id, type: r.type, hasMedia: !!r.raw })));

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkMedia();
