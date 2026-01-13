
import { Pool } from 'pg';

async function checkAliasesBridge() {
    const connectionString = process.env.DATABASE_URL || 'postgres://anna:anna@localhost:5432/anna';
    const pool = new Pool({ connectionString });
    const lid = '117923158999266@lid';

    try {
        const client = await pool.connect();

        console.log(`🔍 Checking aliases for LID: ${lid}`);

        // Get Key for LID
        const keyRes = await client.query('SELECT chat_key FROM session_chat_aliases WHERE alias = $1', [lid]);
        if ((keyRes.rowCount || 0) === 0) {
            console.log('❌ LID has NO alias record.');
            return;
        }
        const key = keyRes.rows[0].chat_key;
        console.log(`✅ Found Chat Key: ${key}`);

        // Find siblings
        const siblings = await client.query('SELECT alias, alias_type FROM session_chat_aliases WHERE chat_key = $1', [key]);
        console.log('Siblings:', siblings.rows);

        // Check if any sibling has a contact name
        for (const sibling of siblings.rows) {
            if (sibling.alias_type === 'jid') {
                const contact = await client.query('SELECT name FROM session_contacts WHERE contact_jid = $1', [sibling.alias]);
                if ((contact.rowCount || 0) > 0 && (contact.rows[0] as any).name) {
                    console.log(`🎉 MATCH! Sibling ${sibling.alias} has name: ${(contact.rows[0] as any).name}`);
                } else {
                    console.log(`Sibling ${sibling.alias} has no contact name.`);
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

checkAliasesBridge();
