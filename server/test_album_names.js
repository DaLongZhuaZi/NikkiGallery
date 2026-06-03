const path = require('path');
const { default: AlbumService } = require('./dist/services/AlbumService.js');
const { initDatabase } = require('./dist/database/index.js');

async function test() {
  try {
    await initDatabase();
    const albums = await AlbumService.scanConfiguredFolders();
    console.log('Albums:');
    for (const a of albums) {
      console.log(`- ${a.name} (${a.path})`);
    }
  } catch(e) {
    console.error(e);
  }
}

test();
