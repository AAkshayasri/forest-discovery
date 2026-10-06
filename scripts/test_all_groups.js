async function testAllGroups() {
  const lat = 22.0, lng = 89.0;
  const minLat = lat - 1.0, maxLat = lat + 1.0;
  const minLng = lng - 1.0, maxLng = lng + 1.0;
  
  // Test Mammals
  const mUrl = `https://api.gbif.org/v1/occurrence/search?classKey=359&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&limit=20`;
  const mRes = await (await fetch(mUrl)).json();
  console.log('Mammals in area:', mRes.results.length);

  // Test Birds
  const bUrl = `https://api.gbif.org/v1/occurrence/search?classKey=212&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&limit=30`;
  const bRes = await (await fetch(bUrl)).json();
  console.log('Birds in area:', bRes.results.length);

  // Test Reptiles (Squamata + Testudines + Crocodylia)
  const repUrls = [
    `https://api.gbif.org/v1/occurrence/search?taxonKey=11592253&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&limit=20`,
    `https://api.gbif.org/v1/occurrence/search?taxonKey=11418114&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&limit=10`,
    `https://api.gbif.org/v1/occurrence/search?taxonKey=11493978&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&limit=10`
  ];
  let repCount = 0;
  for (const ru of repUrls) {
    const rRes = await (await fetch(ru)).json();
    repCount += rRes.results.length;
    rRes.results.slice(0, 2).forEach(r => console.log('  Reptile:', r.species, '| Class:', r.class));
  }
  console.log('Total Reptiles found:', repCount);
}
testAllGroups();
