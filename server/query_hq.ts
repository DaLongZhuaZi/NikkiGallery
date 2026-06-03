import { initDatabase } from './src/database';
import ImageModel from './src/models/Image';

async function main() {
  await initDatabase();
  const res = ImageModel.findAll();
  for (const img of res.images) {
    if (img.path.includes('HighQuality')) {
      if (img.cameraParams) {
        const params = JSON.parse(img.cameraParams);
        console.log(`HighQuality Image ${img.id}: X=${params.positionX}, Y=${params.positionY}, Z=${params.positionZ}`);
      }
    }
  }
}
main();
