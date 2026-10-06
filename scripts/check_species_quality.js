import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all(`
  SELECT count(*) as total_species,
         sum(case when common_name IS NULL OR common_name = '' OR common_name = scientific_name OR common_name = genus THEN 1 ELSE 0 END) as generic_names,
         sum(case when image_url IS NULL OR image_url = '' THEN 1 ELSE 0 END) as missing_images,
         sum(case when image_url LIKE '%unsplash%' THEN 1 ELSE 0 END) as unsplash_images,
         sum(case when image_url LIKE '%wikimedia%' OR image_url LIKE '%wikipedia%' OR image_url LIKE '%inaturalist%' OR image_url LIKE '%observation.org%' OR image_url LIKE '%gbif%' THEN 1 ELSE 0 END) as verified_photo_images
  FROM species_master
`, (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);
  db.close();
});
