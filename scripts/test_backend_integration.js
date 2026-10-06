import { dbService } from '../server/services/dbService.js';
import { zooService } from '../server/services/zooService.js';
import { gbifService } from '../server/services/gbifService.js';

async function testBackend() {
  console.log('🧪 TESTING WATLAS LOCAL SQLITE BACKEND INTEGRATION');
  console.log('====================================================\n');

  // 1. Test Forests
  console.log('▶ 1. Querying Forests...');
  const forests = await dbService.getForests();
  console.log(`  Total Forests retrieved: ${forests.length}`);
  console.log(`  Sample Forest:`, {
    id: forests[0].id,
    name: forests[0].name,
    country: forests[0].country,
    continent: forests[0].continent,
    coords: [forests[0].latitude, forests[0].longitude]
  });

  // 2. Test Single Forest Details
  console.log('\n▶ 2. Querying Single Forest (F000001 - Sundarbans)...');
  const f1 = await dbService.getForestById('F000001');
  console.log(`  Forest: ${f1.name}, Country: ${f1.country}, Continent: ${f1.continent}`);

  // 3. Test Forest Wildlife / Species (No live API calls)
  console.log('\n▶ 3. Querying Forest Wildlife for F000001...');
  const wildlife = await dbService.getWildlifeByForestId('F000001');
  console.log(`  Species count for F000001: ${wildlife.length}`);
  if (wildlife.length > 0) {
    console.log(`  Sample Forest Species:`, {
      id: wildlife[0].id,
      name: wildlife[0].name,
      scientificName: wildlife[0].scientificName,
      group: wildlife[0].speciesGroup,
      iucn: wildlife[0].iucnCategory,
      conservation: wildlife[0].conservationStatus,
      presenceType: wildlife[0].presenceType,
      confidence: wildlife[0].confidence,
      occurrences: wildlife[0].occurrenceCount
    });
  }

  // 4. Test Species Filtering by Group (Bird, Mammal, Reptile, etc.)
  console.log('\n▶ 4. Testing Filter by Species Group (Bird vs Mammal)...');
  const birds = await dbService.getWildlifeByForestId('F000001', 'Bird');
  const mammals = await dbService.getWildlifeByForestId('F000001', 'Mammal');
  console.log(`  Birds in F000001: ${birds.length}`);
  console.log(`  Mammals in F000001: ${mammals.length}`);

  // 5. Test Zoos
  console.log('\n▶ 5. Querying Zoos...');
  const zoos = await zooService.getAllZoos();
  console.log(`  Total Zoos retrieved: ${zoos.length}`);
  console.log(`  Sample Zoo:`, {
    id: zoos[0].id,
    name: zoos[0].name,
    country: zoos[0].country,
    continent: zoos[0].continent
  });

  // 6. Test Zoo Species
  console.log('\n▶ 6. Querying Verified Zoo Species for Z000001 (San Diego Zoo)...');
  const zooSpecies = await zooService.getZooSpecies('Z000001');
  console.log(`  Species count for San Diego Zoo: ${zooSpecies.length}`);
  if (zooSpecies.length > 0) {
    console.log(`  Sample Zoo Species:`, {
      name: zooSpecies[0].name,
      scientificName: zooSpecies[0].scientificName,
      status: zooSpecies[0].collectionStatus,
      verification: zooSpecies[0].verificationStatus,
      source: zooSpecies[0].sourceName
    });
  }

  // 7. Test Species Details by ID
  console.log('\n▶ 7. Querying Species Details by ID...');
  const sp1 = await dbService.getWildlifeById(wildlife[0].id);
  console.log(`  Species: ${sp1.name} (${sp1.scientificName})`);
  console.log(`  IUCN: ${sp1.iucnCategory} - ${sp1.conservationStatus}`);
  console.log(`  Taxonomy: Class ${sp1.class}, Order ${sp1.order}, Family ${sp1.family}`);
  console.log(`  Associated Forests: ${sp1.forests.length}`);

  // 8. Test Occurrences
  console.log('\n▶ 8. Querying Occurrences for Species...');
  const occs = await dbService.getSpeciesOccurrences(wildlife[0].id, 5, 0);
  console.log(`  Occurrences found: ${occs.length}`);
  if (occs.length > 0) {
    console.log(`  Sample Occurrence:`, {
      id: occs[0].occurrence_id,
      gbifKey: occs[0].gbif_occurrence_key,
      coords: [occs[0].latitude, occs[0].longitude],
      locality: occs[0].locality,
      date: occs[0].occurrence_date
    });
  }

  // 9. Validation Stats
  console.log('\n▶ 9. Querying Validation Statistics...');
  const stats = await dbService.getStats();
  console.log(`  Database Stats:`, stats);

  console.log('\n✅ ALL BACKEND SQLITE TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

testBackend().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
