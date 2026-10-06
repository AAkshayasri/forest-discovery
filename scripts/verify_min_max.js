import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all(`
  SELECT 
    min(mammals) as min_mammals, max(mammals) as max_mammals,
    min(birds) as min_birds, max(birds) as max_birds,
    min(reptiles) as min_reptiles, max(reptiles) as max_reptiles,
    count(*) as total_forests
  FROM (
    SELECT f.forest_id,
      SUM(CASE WHEN sm.species_group = 'Mammal' THEN 1 ELSE 0 END) as mammals,
      SUM(CASE WHEN sm.species_group = 'Bird' THEN 1 ELSE 0 END) as birds,
      SUM(CASE WHEN sm.species_group = 'Reptile' THEN 1 ELSE 0 END) as reptiles
    FROM forests f
    LEFT JOIN forest_species fs ON f.forest_id = fs.forest_id
    LEFT JOIN species_master sm ON fs.species_id = sm.species_id
    GROUP BY f.forest_id
  )
`, (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);
  db.close();
});
