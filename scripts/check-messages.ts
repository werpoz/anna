#!/usr/bin/env bun
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        // Check messages count
        const messagesResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM session_messages
    `);

        console.log('\n=== Messages Stats ===');
        console.log(`Total messages in DB: ${messagesResult.rows[0].total}`);

        // Check recent messages
        const recentMessages = await pool.query(`
      SELECT 
        message_id,
        chat_jid,
        from_me,
        message_text,
        message_type,
        created_at
      FROM session_messages 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

        console.log('\n=== Recent Messages ===');
        recentMessages.rows.forEach(row => {
            console.log(`${row.from_me ? 'ME' : 'THEM'} → ${row.chat_jid}`);
            console.log(`  Text: ${row.message_text?.substring(0, 60) || '[' + row.message_type + ']'}`);
            console.log(`  Time: ${row.created_at}`);
            console.log('');
        });

        // Check chats count
        const chatsResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM session_chats
    `);

        console.log(`Total chats in DB: ${chatsResult.rows[0].total}`);

        // Check if there are any sessions
        const sessionsResult = await pool.query(`
      SELECT session_id, status, created_at
      FROM sessions
      ORDER BY created_at DESC
      LIMIT 1
    `);

        if (sessionsResult.rows.length > 0) {
            const session = sessionsResult.rows[0];
            console.log(`\nLatest session: ${session.session_id} (${session.status})`);

            // Check messages for this session
            const sessionMessages = await pool.query(`
        SELECT COUNT(*) as count
        FROM session_messages
        WHERE session_id = $1
      `, [session.session_id]);

            console.log(`Messages for this session: ${sessionMessages.rows[0].count}`);
        }

    } catch (err) {
        console.error('Error:', (err as Error).message);
    } finally {
        await pool.end();
    }
}

check();
