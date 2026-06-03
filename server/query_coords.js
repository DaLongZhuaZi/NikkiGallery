import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('data/database.sqlite');

db.all("SELECT id, camera_params FROM images WHERE camera_params IS NOT NULL LIMIT 10", (err, rows) => {
  if (err) throw err;
  for (const row of rows) {
    const params = JSON.parse(row.camera_params);
    console.log(`Image ${row.id}: X=${params.positionX}, Y=${params.positionY}, Z=${params.positionZ}`);
  }
  db.close();
});
