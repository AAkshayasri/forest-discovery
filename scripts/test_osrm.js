async function testOsrm() {
  // Chennai start to Guindy National Park / Arignar Anna Zoological Park
  const startLat = 13.0827;
  const startLng = 80.2707;
  const endLat = 12.8797;
  const endLng = 80.0822;

  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
  console.log("Fetching OSRM route:", url);

  const res = await fetch(url, { headers: { 'User-Agent': 'WildAtlas/1.0' } });
  const data = await res.json();

  if (data.code === 'Ok' && data.routes?.length > 0) {
    const r = data.routes[0];
    console.log("✓ Route Found!");
    console.log(`  Distance: ${(r.distance / 1000).toFixed(2)} km`);
    console.log(`  Duration: ${Math.round(r.duration / 60)} min`);
    console.log(`  Geometry Coordinates Count: ${r.geometry.coordinates.length}`);
    console.log(`  Steps Count: ${r.legs[0].steps.length}`);
    console.log("  Sample Step 1:", r.legs[0].steps[0].maneuver);
    console.log("  Sample Step 2:", r.legs[0].steps[1]?.maneuver);
  } else {
    console.error("Route error:", data);
  }
}

testOsrm();
