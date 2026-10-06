import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database/watlas.db');

const names = ['Macaca radiata', 'Bos frontalis', 'Axis axis', 'Elephas maximus', 'Panthera tigris', 'Panthera leo', 'Crocodylus palustris'];

db.all(`SELECT species_id, scientific_name, common_name, species_group, image_url FROM species_master WHERE scientific_name IN (${names.map(n => `'${n}'`).join(',')})`, (err, rows) => {
  if (err) console.error(err);
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
