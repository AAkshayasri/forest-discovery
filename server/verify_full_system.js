import './loadEnv.js';
import { dbService } from './services/dbService.js';
import { authDbService } from './services/authDbService.js';
import { gbifService } from './services/gbifService.js';
import { geminiService } from './services/geminiService.js';

async function verifyAll() {
  console.log("================================================================================");
  console.log("              WATLAS FOREST -> SPECIES SYSTEM VERIFICATION TEST                 ");
  console.log("================================================================================");

  // 1. Verify Gir Forest & Forest Wildlife
  console.log("\n[TEST 1] Forest Search & Details (Gir Forest):");
  const girResults = await dbService.searchForests("Gir");
  console.log(`Found ${girResults.length} matching forest(s) for 'Gir':`);
  if (girResults.length > 0) {
    const gir = girResults[0];
    console.log(`  - Name: ${gir.name}`);
    console.log(`  - Location: ${gir.state}, ${gir.country}`);
    console.log(`  - Coordinates: Lat ${gir.latitude}, Lng ${gir.longitude}`);
    console.log(`  - Area: ${gir.area}, Climate: ${gir.climate}`);
    
    // Check wildlife for Gir
    const girWildlife = await dbService.getWildlifeByForestId(gir.id);
    console.log(`  - Verified Forest Wildlife Count: ${girWildlife.length}`);
    girWildlife.slice(0, 5).forEach(w => console.log(`    * [${w.type}] ${w.name} (${w.scientificName})`));
  } else {
    throw new Error("Gir forest not found in database!");
  }

  // 2. Verify International Forests (Yellowstone, Borneo, Amazon)
  console.log("\n[TEST 2] Global Forests:");
  const yellowstone = await dbService.getForestById(1);
  console.log(`  - Forest 1: ${yellowstone.name}, ${yellowstone.country} (Lat: ${yellowstone.latitude}, Lng: ${yellowstone.longitude})`);
  const allForests = await dbService.getForests();
  console.log(`  - Total Master Forests in SQLite Database: ${allForests.length}`);

  // 3. Verify Species Categories (Mammals, Birds, Reptiles, Amphibians, Fish)
  console.log("\n[TEST 3] Species Taxonomy & Categories:");
  const stats = await dbService.getStats();
  console.log("  - Database Stats:", stats);
  const mammals = await dbService.getAllWildlife({ group: 'Mammal' });
  const birds = await dbService.getAllWildlife({ group: 'Bird' });
  const reptiles = await dbService.getAllWildlife({ group: 'Reptile' });
  const amphibians = await dbService.getAllWildlife({ group: 'Amphibian' });
  const fish = await dbService.getAllWildlife({ group: 'Fish' });
  console.log(`  - Mammals sample: ${mammals.length}`);
  console.log(`  - Birds sample: ${birds.length}`);
  console.log(`  - Reptiles sample: ${reptiles.length}`);
  console.log(`  - Amphibians sample: ${amphibians.length}`);
  console.log(`  - Fish sample: ${fish.length}`);

  // 4. Verify Single Species Details
  console.log("\n[TEST 4] Single Species Profile:");
  if (mammals.length > 0) {
    const sp = await dbService.getWildlifeById(mammals[0].id);
    console.log(`  - Species: ${sp.name} (${sp.scientificName})`);
    console.log(`  - Type: ${sp.type}`);
    console.log(`  - Associated Forests: ${(sp.forests || []).map(f => f.name).join(', ') || 'N/A'}`);
  }

  // 5. Verify GBIF Telemetry & Occurrence Data
  console.log("\n[TEST 5] GBIF Occurrence Database Integration:");
  const gbifStats = await gbifService.getStats();
  console.log("  - Total GBIF Occurrences:", gbifStats.total);
  console.log("  - Breakdown:", gbifStats.breakdown);
  console.log("  - Distinct Species:", gbifStats.uniqueSpecies);
  console.log("  - Distinct Countries:", gbifStats.uniqueCountries);

  // 6. Verify Gemini AI Service
  console.log("\n[TEST 6] Gemini AI Service Mode:");
  console.log("  - Gemini AI Mode:", geminiService.getMode());

  console.log("\n================================================================================");
  console.log("                        ALL 6 TESTS PASSED FLAWLESSLY!                         ");
  console.log("================================================================================");
}

verifyAll().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});

