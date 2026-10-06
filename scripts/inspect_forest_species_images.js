import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all(`
  SELECT 
    sm.species_group,
    count(DISTINCT sm.species_id) as distinct_forest_species,
    sum(case when sm.image_url LIKE '%unsplash%' then 1 else 0 end) as unsplash_count,
    sum(case when sm.image_url LIKE '%wikimedia%' or sm.image_url LIKE '%wikipedia%' then 1 else 0 end) as wiki_count,
    sum(case when sm.image_url LIKE '%inaturalist%' or sm.image_url LIKE '%observation.org%' then 1 else 0 end) as inat_count,
    sum(case when sm.image_url IS NULL or trim(sm.image_url) = '' then 1 else 0 end) as null_count
  FROM forest_species fs
  JOIN species_master sm ON fs.species_id = sm.species_id
  GROUP BY sm.species_group
`, (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);

  // Check sample image URLs from forest species
  db.all(`
    SELECT DISTINCT sm.species_id, sm.common_name, sm.scientific_name, sm.species_group, sm.image_url
    FROM forest_species fs
    JOIN species_master sm ON fs.species_id = sm.species_id
    WHERE sm.species_group IN ('Mammal', 'Bird', 'Reptile')
    LIMIT 20
  `, (err2, sample) => {
    if (err2) console.error(err2);
    else {
      console.log("\nSample linked species image URLs:");
      console.table(sample);
    }
    db.close();
  });
});
