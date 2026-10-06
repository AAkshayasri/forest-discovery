async function testReptiles() {
  const lat = 22.0, lng = 89.0;
  const minLat = lat - 1.5, maxLat = lat + 1.5;
  const minLng = lng - 1.5, maxLng = lng + 1.5;
  
  const urls = [
    `https://api.gbif.org/v1/occurrence/search?taxonKey=358&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&limit=10`,
    `https://api.gbif.org/v1/occurrence/search?taxonKey=11592253&decimalLatitude=${minLat},${maxLat}&decimalLongitude=${minLng},${maxLng}&hasCoordinate=true&limit=10`,
    `https://api.gbif.org/v1/occurrence/search?country=BD&taxonKey=358&hasCoordinate=true&limit=10`,
    `https://api.gbif.org/v1/occurrence/search?country=IN&taxonKey=358&limit=10`
  ];

  for (const u of urls) {
    const res = await (await fetch(u)).json();
    console.log(u.substring(30, 85), '=> count:', res.count, 'results:', res.results.length);
    if (res.results.length > 0) {
      console.log('   Sample:', res.results[0].species, '|', res.results[0].class, '|', res.results[0].order);
    }
  }
}
testReptiles();
