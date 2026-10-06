// Using native fetch

async function testGbif() {
  const lat = 22.0, lng = 89.0;
  const minLat = lat - 0.8, maxLat = lat + 0.8;
  const minLng = lng - 0.8, maxLng = lng + 0.8;
  
  const mamUrl = `https://api.gbif.org/v1/occurrence/search?classKey=359&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&hasGeospatialIssue=false&limit=15`;
  const birdUrl = `https://api.gbif.org/v1/occurrence/search?classKey=212&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&hasGeospatialIssue=false&limit=25`;
  const repUrl = `https://api.gbif.org/v1/occurrence/search?classKey=358&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&hasGeospatialIssue=false&limit=15`;

  console.log('Fetching mammal...');
  const mRes = await (await globalThis.fetch(mamUrl)).json();
  console.log('Mammals found:', mRes.results.length);
  mRes.results.slice(0, 3).forEach(r => console.log('  Mammal:', r.species || r.scientificName, '| Class:', r.class));

  console.log('Fetching bird...');
  const bRes = await (await globalThis.fetch(birdUrl)).json();
  console.log('Birds found:', bRes.results.length);
  bRes.results.slice(0, 3).forEach(r => console.log('  Bird:', r.species || r.scientificName, '| Class:', r.class));

  console.log('Fetching reptile...');
  const rRes = await (await globalThis.fetch(repUrl)).json();
  console.log('Reptiles found:', rRes.results.length);
  rRes.results.slice(0, 3).forEach(r => console.log('  Reptile:', r.species || r.scientificName, '| Class:', r.class));
}
testGbif();
