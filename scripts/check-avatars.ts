#!/usr/bin/env bun
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/anna',
});

async function checkAvatars() {
    try {
        // Check if contacts have avatar URLs
        const contactsResult = await pool.query(`
      SELECT contact_jid, name, img_url 
      FROM session_contacts 
      WHERE img_url IS NOT NULL 
      LIMIT 10
    `);

        console.log('\n=== Contacts with Avatar URLs ===');
        console.log(`Found ${contactsResult.rows.length} contacts with profile pictures`);
        contactsResult.rows.forEach(row => {
            console.log(`- ${row.name || row.contact_jid}: ${row.img_url?.substring(0, 80)}...`);
        });

        // Check total contacts
        const totalResult = await pool.query('SELECT COUNT(*) FROM session_contacts');
        console.log(`\nTotal contacts in DB: ${totalResult.rows[0].count}`);

        // Check sessions
        const sessionsResult = await pool.query('SELECT session_id FROM sessions ORDER BY created_at DESC LIMIT 1');
        if (sessionsResult.rows.length > 0) {
            const sessionId = sessionsResult.rows[0].session_id;
            console.log(`\nLatest session: ${sessionId}`);

            // Test API endpoint simulation
            console.log('\n=== Simulating /api/chats response ===');
            const chatsResult = await pool.query(`
        SELECT chat_jid, chat_name, unread_count 
        FROM session_chats 
        WHERE session_id = $1 
        LIMIT 5
      `, [sessionId]);

            console.log(`Found ${chatsResult.rows.length} chats`);

            for (const chat of chatsResult.rows) {
                // Find matching contact
                const contactResult = await pool.query(`
          SELECT img_url FROM session_contacts 
          WHERE session_id = $1 AND contact_jid = $2
        `, [sessionId, chat.chat_jid]);

                const avatar = contactResult.rows[0]?.img_url || null;
                console.log(`\nChat: ${chat.chat_name || chat.chat_jid}`);
                console.log(`  JID: ${chat.chat_jid}`);
                console.log(`  Avatar: ${avatar ? 'YES - ' + avatar.substring(0, 60) + '...' : 'NO'}`);
            }
        } else {
            console.log('\nNo sessions found in database');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkAvatars();
