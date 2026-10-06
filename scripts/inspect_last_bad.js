import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all(`
  SELECT species_id, scientific_name, common_name, species_group, image_url
  FROM species_master
  WHERE image_url LIKE '%spectrogram%'
     OR image_url LIKE '%xeno-canto%'
     OR image_url LIKE '%unsplash%'
`, (err, rows) => {
  if (err) console.error(err);
  else {
    console.log(`Total non-photo remaining: ${rows.length}`);
    console.table(rows);
  }
  db.close();
});
