import { resolveMediaMeta } from '../src/contexts/Core/Session/infrastructure/mappers/BaileysMediaMapper';
import { proto } from 'baileys';

// Mock message from debug output
const mockMessage: any = {
    key: { id: 'test-123', remoteJid: '123@s.whatsapp.net' },
    message: {
        "templateMessage": {
            "hydratedFourRowTemplate": {
                "imageMessage": {
                    "url": "https://mmg.whatsapp.net/v/t62.7118-24/30983637_108480434316335_4816654944458316377_n.enc?ccb=11-4&oh=01_Q5AaIHeKk&oe=67B0F845&_nc_sid=5e03e0",
                    "mimetype": "image/jpeg",
                    "fileSha256": "abcdef",
                    "fileLength": "123456",
                    "height": 1000,
                    "width": 1000,
                    "mediaKey": "xyz",
                    "fileEncSha256": "xyz",
                    "directPath": "/v/t62.7118-24/..."
                }
            }
        }
    }
};

const mockViewOnce: any = {
    key: { id: 'vo-123', remoteJid: '123@s.whatsapp.net' },
    message: {
        "viewOnceMessageV2": {
            "message": {
                "imageMessage": {
                    "url": "https://mmg.whatsapp.net/...",
                    "mimetype": "image/jpeg"
                }
            }
        }
    }
};

console.log('Testing Template Message:');
const meta1 = resolveMediaMeta(mockMessage);
console.log(meta1 ? '✅ Found Media:' : '❌ No Media Found', meta1);

console.log('\nTesting ViewOnce Message:');
const meta2 = resolveMediaMeta(mockViewOnce);
console.log(meta2 ? '✅ Found Media:' : '❌ No Media Found', meta2);
