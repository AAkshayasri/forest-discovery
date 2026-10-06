import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all("PRAGMA table_info(forest_species);", (err, rows) => {
  if (err) console.error(err);
  else console.log("forest_species columns:", rows);

  db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='forest_species';", (err2, rows2) => {
    if (err2) console.error(err2);
    else console.log("forest_species DDL:", rows2);

    db.all("SELECT * FROM forest_species LIMIT 5;", (err3, rows3) => {
      if (err3) console.error(err3);
      else console.log("Sample rows:", rows3);
      db.close();
    });
  });
});
