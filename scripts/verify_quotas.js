import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/database/watlas.db');

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

async function verifyQuotas() {
  console.log("================================================================================");
  console.log("             WATLAS 20-30 SPECIES QUOTA & SYSTEM AUDIT                          ");
  console.log("================================================================================\n");

  const rows = await dbAll(`
    SELECT f.forest_id, f.forest_name, f.continent, f.country,
           SUM(CASE WHEN sm.species_group = 'Mammal' THEN 1 ELSE 0 END) as mammal_count,
           SUM(CASE WHEN sm.species_group = 'Bird' THEN 1 ELSE 0 END) as bird_count,
           SUM(CASE WHEN sm.species_group = 'Reptile' THEN 1 ELSE 0 END) as reptile_count,
           COUNT(fs.species_id) as total_species
    FROM forests f
    LEFT JOIN forest_species fs ON f.forest_id = fs.forest_id
    LEFT JOIN species_master sm ON fs.species_id = sm.species_id
    GROUP BY f.forest_id
    ORDER BY f.forest_id ASC
  `);

  const failM = rows.filter(r => r.mammal_count < 20 || r.mammal_count > 30);
  const failB = rows.filter(r => r.bird_count < 20 || r.bird_count > 30);
  const failR = rows.filter(r => r.reptile_count < 20 || r.reptile_count > 30);

  console.log(`▶ Total Forests Audited: ${rows.length}`);
  console.log(`  Mammal Quota  [20-30]: ${rows.length - failM.length}/${rows.length} passed (${failM.length === 0 ? '✅ 100% PASS' : '❌ FAIL: ' + failM.length})`);
  console.log(`  Bird Quota    [20-30]: ${rows.length - failB.length}/${rows.length} passed (${failB.length === 0 ? '✅ 100% PASS' : '❌ FAIL: ' + failB.length})`);
  console.log(`  Reptile Quota [20-30]: ${rows.length - failR.length}/${rows.length} passed (${failR.length === 0 ? '✅ 100% PASS' : '❌ FAIL: ' + failR.length})`);

  console.log("\n================================================================================");
  if (failM.length === 0 && failB.length === 0 && failR.length === 0) {
    console.log("🌟 ALL 268 FORESTS SATISFY 100% OF THE 20-30 SPECIES REQUIREMENTS!");
  } else {
    console.error("❌ AUDIT FAILED!");
  }
  console.log("================================================================================");

  db.close();
}

verifyQuotas();
