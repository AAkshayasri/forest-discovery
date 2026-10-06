import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all(`
  SELECT 
    species_group,
    count(*) as total,
    sum(case when image_url LIKE '%spectrogram%' or image_url LIKE '%xeno-canto%' then 1 else 0 end) as spectrograms,
    sum(case when image_url LIKE '%unsplash%' then 1 else 0 end) as unsplash,
    sum(case when image_url LIKE '%wikimedia%' or image_url LIKE '%wikipedia%' or image_url LIKE '%inaturalist%' or image_url LIKE '%observation.org%' then 1 else 0 end) as verified_real_photos
  FROM species_master
  GROUP BY species_group
`, (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);
  db.close();
});
