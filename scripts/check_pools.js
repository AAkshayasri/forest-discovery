import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.all(`
  SELECT f.continent, sm.species_group, count(DISTINCT sm.species_id) as distinct_species
  FROM forest_species fs
  JOIN forests f ON fs.forest_id = f.forest_id
  JOIN species_master sm ON fs.species_id = sm.species_id
  WHERE sm.species_group IN ('Mammal', 'Bird', 'Reptile')
  GROUP BY f.continent, sm.species_group
`, (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);
  db.close();
});
