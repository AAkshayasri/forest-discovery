import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all("PRAGMA table_info(forests);", (err, rows) => {
  if (err) console.error(err);
  else console.log("forests table columns:", rows);
  db.close();
});
