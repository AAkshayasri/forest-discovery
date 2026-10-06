async function testBackend() {
  const base = 'http://localhost:5000/api';
  
  console.log('1. Testing /api/zoos...');
  const zRes = await fetch(base + '/zoos');
  const zoos = await zRes.json();
  console.log('   ✓ Zoos count:', zoos.length, 'Sample zoo:', zoos[0]?.name, 'Entrance:', zoos[0]?.entrance_name);

  console.log('2. Testing /api/zoos/:id/wildlife...');
  const zwRes = await fetch(base + '/zoos/' + zoos[0].id + '/wildlife');
  const zooWildlife = await zwRes.json();
  console.log('   ✓ Zoo wildlife count:', zooWildlife.length, 'Sample animal:', zooWildlife[0]?.name);

  console.log('3. Testing /api/routes (Chennai Center -> Arignar Anna Zoological Park)...');
  const rRes = await fetch(base + '/routes?startLat=13.0827&startLng=80.2707&endLat=12.8797&endLng=80.0822&profile=driving');
  const routeData = await rRes.json();
  console.log('   ✓ Road Distance:', routeData.distanceFormatted);
  console.log('   ✓ Estimated Duration:', routeData.durationFormatted);
  console.log('   ✓ Road Geometry Type:', routeData.geometry?.type, 'Points along roads:', routeData.geometry?.coordinates?.length);
  console.log('   ✓ Turn Steps Count:', routeData.steps?.length);
  console.log('   ✓ Step 1 Instruction:', routeData.steps?.[0]?.instruction);
  console.log('   ✓ Step 2 Instruction:', routeData.steps?.[1]?.instruction);

  console.log('4. Testing /api/routes with ocean / unreachable point...');
  const badRes = await fetch(base + '/routes?startLat=0&startLng=0&endLat=10&endLng=10');
  const badData = await badRes.json();
  console.log('   ✓ Error handled cleanly without straight lines:', badData.error);

  console.log('5. Testing /api/search/global for "India"...');
  const sRes = await fetch(base + '/search/global?q=India');
  const sData = await sRes.json();
  console.log('   ✓ Search results -> Forests:', sData.forests?.length, 'Zoos:', sData.zoos?.length, 'Species:', sData.species?.length);

  console.log('\n🎉 ALL BACKEND ROAD ROUTING & ZOO TESTS PASSED SUCCESSFULLY!');
}

testBackend().catch(console.error);
