import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all(`
  SELECT 
    species_group,
    count(*) as total,
    sum(case when image_url IS NULL or image_url = '' then 1 else 0 end) as missing_images,
    sum(case when image_url LIKE '%unsplash%' then 1 else 0 end) as unsplash_images,
    sum(case when image_url LIKE '%wikimedia%' or image_url LIKE '%wikipedia%' or image_url LIKE '%inaturalist%' or image_url LIKE '%observation.org%' or image_url LIKE '%gbif%' then 1 else 0 end) as photo_images
  FROM species_master
  GROUP BY species_group
`, (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);

  // Check sample species across Mammals, Birds, Reptiles
  db.all(`
    SELECT species_id, scientific_name, common_name, species_group, image_url
    FROM species_master
    WHERE species_group IN ('Mammal', 'Bird', 'Reptile')
    ORDER BY species_id ASC
    LIMIT 15
  `, (err2, sample) => {
    if (err2) console.error(err2);
    else {
      console.log("\nSample Species & Images:");
      console.table(sample);
    }
    db.close();
  });
});
