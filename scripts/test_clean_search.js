async function testCleanedSearch() {
  const list = [
    'Turdus Linnaeus, 1758',
    'Eudocima Billberg, 1820',
    'Exocelina Broun, 1886',
    'Aedes Meigen, 1818',
    'Dermacentor C.L.Koch, 1844',
    'Anopheles Meigen, 1818',
    'Barbus Cuvier & Cloquet, 1816'
  ];

  for (const raw of list) {
    const clean = raw.split(',')[0].split(' ')[0].trim();
    console.log(`\nTesting raw "${raw}" -> clean "${clean}":`);
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`, {
        headers: { 'User-Agent': 'WildAtlas/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`  [Wikipedia] ${data.title} -> ${data.thumbnail?.source ? 'PHOTO FOUND: ' + data.thumbnail.source : 'No photo'}`);
      }
    } catch (e) {
      console.log(`  [Error] ${e.message}`);
    }
  }
}

testCleanedSearch();
