const path = require('path');
const fs = require('fs');

// We need to import the transpiled javascript from dist/
const { default: AlbumService } = require('./dist/services/AlbumService.js');

async function test() {
  try {
    const dirs = await AlbumService.discoverScreenshotDirs('G:/InfinityNikki');
    console.log('Discovered Dirs:', dirs);
  } catch(e) {
    console.error(e);
  }
}

test();
