const path = require('path');
const { ImageDecryptService } = require('./dist/services/ImageDecryptService.js');
const configService = require('./dist/services/ConfigService.js').configService;

async function test() {
  try {
    // 强制设置一个 UID 供测试
    configService.update({ uids: ['100045859'] });

    const filePath = 'G:\\InfinityNikki\\X6Game\\Saved\\GamePlayPhotos\\100045859\\NikkiPhotos_HighQuality\\2025_08_27_21_33_29_1073667.jpeg';
    const hasEncrypted = ImageDecryptService.hasEncryptedData(filePath);
    console.log('Has encrypted data:', hasEncrypted);

    const result = await ImageDecryptService.decryptImage(filePath);
    console.log('Result metadata keys:', result.metadata ? Object.keys(result.metadata) : null);
  } catch(e) {
    console.error(e);
  }
}

test();
