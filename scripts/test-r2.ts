#!/usr/bin/env bun
import { S3Storage } from '../src/contexts/Shared/infrastructure/Storage/S3Storage';

async function testR2() {
    try {
        console.log('🧪 Testing R2 bucket connection...\n');

        // Initialize S3Storage
        const storage = new S3Storage();
        console.log('✅ S3Storage initialized successfully');

        // Create test file
        const testContent = 'Hola Mundo! 🌍\nThis is a test file from Anna backend.\nTimestamp: ' + new Date().toISOString();
        const testBuffer = Buffer.from(testContent, 'utf-8');

        console.log('\n📤 Uploading test file to R2...');
        console.log('Content:', testContent);

        // Upload to R2
        const result = await storage.uploadBuffer({
            key: 'test/hola-mundo.txt',
            body: testBuffer,
            contentType: 'text/plain',
        });

        console.log('\n✅ Upload successful!');
        console.log('📍 Key:', result.key);
        console.log('🔗 Public URL:', result.url);

        console.log('\n✨ Test completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Visit the URL above in your browser');
        console.log('2. You should see the "Hola Mundo" message');
        console.log('3. Check Cloudflare R2 dashboard for the file');

    } catch (error) {
        console.error('\n❌ Test failed!');
        console.error('Error:', error instanceof Error ? error.message : error);

        if (error instanceof Error && error.message.includes('S3 configuration is incomplete')) {
            console.error('\n💡 Make sure your .env file has:');
            console.error('  - S3_ENDPOINT');
            console.error('  - S3_BUCKET');
            console.error('  - S3_ACCESS_KEY');
            console.error('  - S3_SECRET_KEY');
        }

        process.exit(1);
    }
}

testR2();
