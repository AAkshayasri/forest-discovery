async function testImageResolvers() {
  const species = [
    'Phylloscopus trochiloides',
    'Locustella lanceolata',
    'Psilopogon virens',
    'Oriolus traillii',
    'Dendrocitta formosae',
    'Tesia olivea',
    'Anthus richardi',
    'Iole propinqua'
  ];

  for (const name of species) {
    console.log(`\nTesting ${name}:`);
    
    // 1. Wikipedia Summary
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`, {
        headers: { 'User-Agent': 'WildAtlas/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.thumbnail?.source) {
          console.log(`  [Wikipedia] Found: ${data.thumbnail.source}`);
          continue;
        }
      }
    } catch (e) {}

    // 2. iNaturalist Taxa API
    try {
      const res = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(name)}&rank=species`, {
        headers: { 'User-Agent': 'WildAtlas/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        const first = data.results?.[0];
        const photo = first?.default_photo?.medium_url || first?.default_photo?.square_url;
        if (photo) {
          console.log(`  [iNaturalist] Found: ${photo} (${first.name})`);
          continue;
        }
      }
    } catch (e) {}

    console.log(`  [FAILED] Could not resolve ${name}`);
  }
}

testImageResolvers();
