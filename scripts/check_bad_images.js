import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all(`
  SELECT 
    sum(case when image_url LIKE '%xeno-canto%' or image_url LIKE '%spectrogram%' then 1 else 0 end) as spectrogram_count,
    sum(case when image_url LIKE '%unsplash%' then 1 else 0 end) as unsplash_count,
    sum(case when image_url LIKE '%wikimedia%' or image_url LIKE '%wikipedia%' then 1 else 0 end) as wikipedia_count,
    sum(case when image_url LIKE '%inaturalist%' or image_url LIKE '%observation.org%' or image_url LIKE '%gbif%' then 1 else 0 end) as observation_count,
    count(*) as total
  FROM species_master
`, (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);
  db.close();
});
