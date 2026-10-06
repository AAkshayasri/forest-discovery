import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all(`
  SELECT species_group, 
         count(*) as total, 
         count(image_url) as with_img,
         sum(case when image_url is null or image_url = '' or image_url like '%placeholder%' or image_url like '%images.unsplash%' then 0 else 1 end) as verified_imgs
  FROM species_master 
  GROUP BY species_group
`, (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);

  // Also check sample species with common names
  db.all(`
    SELECT species_id, scientific_name, common_name, species_group, image_url 
    FROM species_master 
    WHERE species_group IN ('Mammal', 'Bird', 'Reptile')
    LIMIT 15
  `, (err2, rows2) => {
    if (err2) console.error(err2);
    else console.table(rows2);
    db.close();
  });
});
