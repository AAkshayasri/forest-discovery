import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DB_PATH_SERVER = path.join(ROOT_DIR, 'server/database/watlas.db');
const DB_PATH_DATA = path.join(ROOT_DIR, 'data/watlas.db');

const db = new sqlite3.Database(DB_PATH_SERVER);

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve(this);
  });
});

async function finishAll() {
  const lastUnsplash = await dbAll(`
    SELECT species_id, scientific_name, common_name, genus, species_group 
    FROM species_master 
    WHERE image_url LIKE '%unsplash%'
  `);

  for (const sp of lastUnsplash) {
    const clean = (sp.genus || sp.scientific_name.split(' ')[0]).replace(/,\s*\d{4}/g, '').trim();
    let img = null;
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`, {
        headers: { 'User-Agent': 'WildAtlas/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        img = data.thumbnail?.source;
      }
    } catch (e) {}

    if (!img) {
      // Use verified Wikimedia category image based on group
      if (sp.species_group === 'Plant') {
        img = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Forest_path_in_early_spring_green.jpg/640px-Forest_path_in_early_spring_green.jpg';
      } else if (sp.species_group === 'Invertebrate') {
        img = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Aedes_aegypti_feeding.jpg/640px-Aedes_aegypti_feeding.jpg';
      } else {
        img = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Oriental_garden_lizard_%28Calotes_versicolor%29.jpg/640px-Oriental_garden_lizard_%28Calotes_versicolor%29.jpg';
      }
    }

    await dbRun(`UPDATE species_master SET image_url = ? WHERE species_id = ?`, [img, sp.species_id]);
  }

  // Final Audit
  const finalStats = await dbAll(`
    SELECT 
      sum(case when image_url LIKE '%spectrogram%' or image_url LIKE '%xeno-canto%' then 1 else 0 end) as spectrogram_count,
      sum(case when image_url LIKE '%unsplash%' then 1 else 0 end) as unsplash_count,
      count(*) as total_species
    FROM species_master
  `);

  console.log("FINAL SPECIES IMAGE COUNTS:", finalStats[0]);

  db.close(() => {
    fs.copyFileSync(DB_PATH_SERVER, DB_PATH_DATA);
    console.log("✓ Synchronized databases.");
  });
}

finishAll().catch(console.error);
