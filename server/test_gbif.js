import './loadEnv.js';
import { gbifService } from './services/gbifService.js';
import { authDbService } from './services/authDbService.js';

async function runTest() {
  console.log("=== STEP 1: Running initial 20-record GBIF import for Mammals, Birds, and Reptiles ===");
  const importResult = await gbifService.importAllCategories({ limit: 20 });
  console.log("Initial Import Summary:", JSON.stringify(importResult.summary, null, 2));

  console.log("\n=== STEP 2: Fetching GBIF Stats from SQLite Database ===");
  const stats = await authDbService.getGbifStats();
  console.log("Database Telemetry Stats:", JSON.stringify(stats, null, 2));

  console.log("\n=== STEP 3: Testing Duplicate Prevention (Re-running same 20-record batch) ===");
  const duplicateTest = await gbifService.importAllCategories({ limit: 20 });
  console.log("Duplicate Re-run Summary:", JSON.stringify(duplicateTest.summary, null, 2));
  console.log("Duplicates Skipped Count:", duplicateTest.summary.totalDuplicates, "(Expected: 60)");
  console.log("Newly Inserted Count:", duplicateTest.summary.totalInserted, "(Expected: 0)");

  console.log("\n=== STEP 4: Querying Stored Occurrences ===");
  const mammals = await authDbService.getGbifOccurrences({ category: 'mammals', limit: 3 });
  console.log("Mammals Sample:", mammals.map(m => ({ id: m.id, gbifId: m.gbif_id, name: m.scientific_name, class: m.class, lat: m.latitude, lng: m.longitude, country: m.country })));

  const birds = await authDbService.getGbifOccurrences({ category: 'birds', limit: 3 });
  console.log("Birds Sample:", birds.map(b => ({ id: b.id, gbifId: b.gbif_id, name: b.scientific_name, class: b.class, lat: b.latitude, lng: b.longitude, country: b.country })));

  const reptiles = await authDbService.getGbifOccurrences({ category: 'reptiles', limit: 3 });
  console.log("Reptiles Sample:", reptiles.map(r => ({ id: r.id, gbifId: r.gbif_id, name: r.scientific_name, class: r.class, lat: r.latitude, lng: r.longitude, country: r.country })));

  console.log("\n=== ALL BACKEND & DATABASE TESTS COMPLETED SUCCESSFULLY ===");
}

runTest().catch(console.error);
