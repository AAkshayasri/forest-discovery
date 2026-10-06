import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve(this);
  });
});

async function testInsert() {
  try {
    const res = await dbRun(`
      INSERT OR REPLACE INTO forest_species (
        forest_id, forest_name, country, continent,
        species_id, common_name, scientific_name, animal_class,
        order_name, family, conservation_status, native_or_introduced,
        source_name, verification_status, presence_type, confidence,
        gbif_occurrence_count, iucn_range_overlap, source, last_verified
      ) VALUES (
        'F000001', 'Sundarbans mangroves', 'India / Bangladesh', 'Asia',
        'S000080', 'Red Panda', 'Ailurus fulgens', 'Mammal',
        'Carnivora', 'Ailuridae', 'Endangered', 'Native',
        'GBIF Occurrence Dataset', 'verified', 'Verified Habitat', 'HIGH',
        1, 1, 'GBIF Regional Biodiversity Verification', datetime('now')
      )
    `);
    console.log("Insert result:", res);
  } catch (e) {
    console.error("Insert error:", e);
  } finally {
    db.close();
  }
}

testInsert();
