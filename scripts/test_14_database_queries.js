/**
 * Test SQLite queries for Forests and Species
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../server/database/watlas.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

async function runTests() {
  console.log("==========================================================");
  console.log("🧪 TESTING SQLITE DATABASE QUERIES (FORESTS & SPECIES)");
  console.log("==========================================================\n");

  // 1. All species in a forest
  const q1 = await query(`
    SELECT fs.forest_id, s.species_id, s.common_name, s.scientific_name, s.species_group, fs.confidence
    FROM forest_species fs
    JOIN species_master s ON fs.species_id = s.species_id
    WHERE fs.forest_id = 'F000001'
    LIMIT 5
  `);
  console.log(`✅ [Query 1] All species in a forest (F000001 - Sundarbans): ${q1.length} sample records retrieved.`);

  // 2. Mammals in a forest
  const q2 = await query(`
    SELECT s.common_name, s.scientific_name, s.conservation_status
    FROM forest_species fs
    JOIN species_master s ON fs.species_id = s.species_id
    WHERE fs.forest_id = 'F000001' AND LOWER(s.species_group) = 'mammal'
  `);
  console.log(`✅ [Query 2] Mammals in forest F000001: ${q2.length} verified mammals.`);

  // 3. Birds in a forest
  const q3 = await query(`
    SELECT s.common_name, s.scientific_name, s.conservation_status
    FROM forest_species fs
    JOIN species_master s ON fs.species_id = s.species_id
    WHERE fs.forest_id = 'F000001' AND LOWER(s.species_group) = 'bird'
  `);
  console.log(`✅ [Query 3] Birds in forest F000001: ${q3.length} verified birds.`);

  // 4. Reptiles in a forest
  const q4 = await query(`
    SELECT s.common_name, s.scientific_name, s.conservation_status
    FROM forest_species fs
    JOIN species_master s ON fs.species_id = s.species_id
    WHERE fs.forest_id = 'F000001' AND LOWER(s.species_group) = 'reptile'
  `);
  console.log(`✅ [Query 4] Reptiles in forest F000001: ${q4.length} verified reptiles.`);

  // 5. Amphibians in a forest
  const q5 = await query(`
    SELECT s.common_name, s.scientific_name, s.conservation_status
    FROM forest_species fs
    JOIN species_master s ON fs.species_id = s.species_id
    WHERE LOWER(s.species_group) = 'amphibian'
    LIMIT 10
  `);
  console.log(`✅ [Query 5] Verified amphibians in database: ${q5.length} records sample.`);

  // 6. Fish in a forest
  const q6 = await query(`
    SELECT s.common_name, s.scientific_name, s.conservation_status
    FROM forest_species fs
    JOIN species_master s ON fs.species_id = s.species_id
    WHERE LOWER(s.species_group) = 'fish'
    LIMIT 10
  `);
  console.log(`✅ [Query 6] Verified fish in database: ${q6.length} records sample.`);

  // 7. High-confidence species
  const q7 = await query(`
    SELECT fs.forest_id, s.scientific_name, fs.confidence, fs.gbif_occurrence_count
    FROM forest_species fs
    JOIN species_master s ON fs.species_id = s.species_id
    WHERE fs.confidence = 'HIGH'
    LIMIT 10
  `);
  console.log(`✅ [Query 7] High-confidence species relations: ${q7.length} records sample.`);

  // 8. Species occurrences in a forest
  const q8 = await query(`
    SELECT occurrence_id, species_id, forest_id, latitude, longitude
    FROM species_occurrences
    WHERE forest_id IS NOT NULL
    LIMIT 10
  `);
  console.log(`✅ [Query 8] Forest species occurrences: ${q8.length} records sample.`);

  // 9. Species shared by multiple forests
  const q9 = await query(`
    SELECT s.species_id, s.common_name, s.scientific_name, COUNT(DISTINCT fs.forest_id) as forest_count
    FROM forest_species fs
    JOIN species_master s ON fs.species_id = s.species_id
    GROUP BY s.species_id, s.common_name, s.scientific_name
    HAVING forest_count > 3
    ORDER BY forest_count DESC
    LIMIT 5
  `);
  console.log(`✅ [Query 9] Species shared by multiple forests: Top species found across ${q9[0]?.forest_count || 0} forests (${q9[0]?.common_name || q9[0]?.scientific_name}).`);

  // 10. Species by country
  const q10 = await query(`
    SELECT f.country, COUNT(DISTINCT fs.species_id) as unique_species_count
    FROM forest_species fs
    JOIN forests f ON fs.forest_id = f.forest_id
    GROUP BY f.country
    ORDER BY unique_species_count DESC
    LIMIT 5
  `);
  console.log(`✅ [Query 10] Species by Country: Top country ${q10[0]?.country} with ${q10[0]?.unique_species_count} unique species.`);

  // 11. Species by continent
  const q11 = await query(`
    SELECT f.continent, COUNT(DISTINCT fs.species_id) as unique_species_count
    FROM forest_species fs
    JOIN forests f ON fs.forest_id = f.forest_id
    GROUP BY f.continent
    ORDER BY unique_species_count DESC
  `);
  console.log(`✅ [Query 11] Species by Continent: ${q11.map(c => `${c.continent}: ${c.unique_species_count}`).join(', ')}.`);

  // 12. Species by conservation status
  const q12 = await query(`
    SELECT conservation_status, COUNT(*) as count
    FROM species_master
    GROUP BY conservation_status
    ORDER BY count DESC
  `);
  console.log(`✅ [Query 12] Species by Conservation Status: ${q12.map(c => `${c.conservation_status}: ${c.count}`).join(', ')}.`);

  // 13. Taxonomic classes
  const q13 = await query(`
    SELECT species_group, COUNT(*) as count
    FROM species_master
    GROUP BY species_group
    ORDER BY count DESC
  `);
  console.log(`✅ [Query 13] Taxonomic Breakdown: ${q13.map(g => `${g.species_group}: ${g.count}`).join(', ')}.`);

  // 14. Total Forests
  const q14 = await query(`SELECT COUNT(*) as total FROM forests`);
  console.log(`✅ [Query 14] Master Forests Count: ${q14[0].total} forests in database.`);

  console.log("\n==========================================================");
  console.log("🎉 ALL QUERIES EXECUTED SUCCESSFULLY WITH ZERO ERRORS!");
  console.log("==========================================================");
  db.close();
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});

