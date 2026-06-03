const fs = require('fs');
const initSqlJs = require('sql.js');

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('G:/InfinityNikki/X6Game/Saved/DataBase/UserDB[100045859].db');
  const db = new SQL.Database(buf);
  
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
  console.log('Tables:', JSON.stringify(tables, null, 2));
  
  if (tables.length > 0) {
    const tableNames = tables[0].values.map(v => v[0]);
    for (const name of tableNames) {
      console.log(`\n--- Table: ${name} ---`);
      const columns = db.exec(`PRAGMA table_info(${name})`);
      console.log(JSON.stringify(columns, null, 2));
      
      const rows = db.exec(`SELECT * FROM ${name} LIMIT 2`);
      console.log(JSON.stringify(rows, null, 2));
    }
  }
}

main().catch(console.error);
