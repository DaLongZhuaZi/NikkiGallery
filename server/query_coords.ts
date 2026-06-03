import { initDatabase } from './src/database';
import ImageModel from './src/models/Image';

async function main() {
  await initDatabase();
  const res = ImageModel.findAll();
  let count = 0;
  for (const img of res.images) {
    if (img.cameraParams) {
      const params = JSON.parse(img.cameraParams);
      console.log(`Image ${img.id}: X=${params.positionX}, Y=${params.positionY}, Z=${params.positionZ}`);
      count++;
      if (count > 20) break;
    }
  }
}
main();
