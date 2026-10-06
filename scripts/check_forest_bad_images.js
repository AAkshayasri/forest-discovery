import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

db.get(`
  SELECT count(DISTINCT species_id) as count FROM forest_species
`, (err, row) => {
  if (err) console.error(err);
  else console.log("Total distinct species linked to forests:", row.count);

  db.all(`
    SELECT DISTINCT sm.species_id, sm.common_name, sm.scientific_name, sm.species_group, sm.image_url
    FROM forest_species fs
    JOIN species_master sm ON fs.species_id = sm.species_id
    WHERE sm.image_url LIKE '%xeno-canto%' 
       OR sm.image_url LIKE '%spectrogram%'
       OR sm.image_url LIKE '%unsplash%'
  `, (err2, badList) => {
    if (err2) console.error(err2);
    else {
      console.log(`Bad / spectrogram / unsplash species in forests: ${badList.length}`);
      console.table(badList.slice(0, 15));
    }
    db.close();
  });
});
