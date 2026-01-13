#!/usr/bin/env bun
/**
 * Script to update R2 URLs in database
 * Changes from old dev URL to new dev URL
 */

import { Pool } from 'pg';

const OLD_URL = 'https://pub-256cdfd5f62e465eb4fdc3e23d6e96dd.r2.dev';
const NEW_URL = 'https://pub-270bbd265a3d458585b7de88ba1de184.r2.dev';

async function updateR2URLs() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });

    try {
        console.log('🔄 Updating R2 URLs in database...\n');
        console.log(`Old URL: ${OLD_URL}`);
        console.log(`New URL: ${NEW_URL}\n`);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Update session_contacts.img_url
            const contactsResult = await client.query(`
        UPDATE session_contacts
        SET img_url = REPLACE(img_url, $1, $2)
        WHERE img_url LIKE $3
      `, [OLD_URL, NEW_URL, OLD_URL + '%']);

            console.log(`✅ Updated ${contactsResult.rowCount} contact profile pictures`);

            // 2. Update session_message_media.url (if exists)
            try {
                await client.query('SAVEPOINT media_update');
                const mediaResult = await client.query(`
          UPDATE session_message_media
          SET url = REPLACE(url, $1, $2)
          WHERE url LIKE $3
        `, [OLD_URL, NEW_URL, OLD_URL + '%']);

                console.log(`✅ Updated ${mediaResult.rowCount} message media URLs`);
                await client.query('RELEASE SAVEPOINT media_update');
            } catch (err) {
                await client.query('ROLLBACK TO SAVEPOINT media_update');
                console.log('⚠️  session_message_media table not found or update failed (skipping)');
            }

            // 3. Check for any other columns that might contain URLs in session_messages
            const checkOther = await client.query(`
        SELECT COUNT(*) as count
        FROM session_messages
        WHERE text LIKE $1
      `, [OLD_URL + '%']);

            if (parseInt(checkOther.rows[0].count) > 0) {
                console.log(`⚠️  Found ${checkOther.rows[0].count} messages with old URL in text column (not updated automatically)`);
            }

            await client.query('COMMIT');
            console.log('\n✨ All URLs updated successfully!');

            // Show summary
            const summary = await client.query(`
        SELECT COUNT(*) as total_contacts_with_r2
        FROM session_contacts
        WHERE img_url LIKE $1
      `, [NEW_URL + '%']);

            console.log(`\n📊 Summary:`);
            console.log(`   Contacts with new R2 URL: ${summary.rows[0].total_contacts_with_r2}`);

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('\n❌ Error updating URLs:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

updateR2URLs();
