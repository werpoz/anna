#!/usr/bin/env bun
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const result = await pool.query(`
      SELECT COUNT(*) as total, 
             COUNT(img_url) as with_avatar 
      FROM session_contacts
    `);

        console.log('Contacts stats:', result.rows[0]);

        const samples = await pool.query(`
      SELECT contact_jid, name, img_url 
      FROM session_contacts 
      WHERE img_url IS NOT NULL 
      LIMIT 3
    `);

        console.log('\nSample contacts with avatars:');
        samples.rows.forEach(r => {
            console.log(`- ${r.name || r.contact_jid}: ${r.img_url?.substring(0, 100)}`);
        });

    } catch (err) {
        console.error('Error:', (err as Error).message);
    } finally {
        await pool.end();
    }
}

check();
