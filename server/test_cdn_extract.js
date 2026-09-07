import fetch from 'node-fetch';

const ids = {
  wolf: '1AIYdIb3O5M',
  owl: 'KBHqwZ4z69Y',
  lynx: 'xKJDwyBtjdQ',
  hornbill: 'dmZt27Hl2Uo',
  python: 'JzQ71rPqeJA',
  chameleon: 'N_GrR8c2EMk',
  toucan: 'vjFC9OjrOtA'
};

for (const [key, id] of Object.entries(ids)) {
  const url = `https://unsplash.com/photos/${id}`;
  try {
    const res = await fetch(url);
    const html = await res.text();
    // Search for a CDN photo URL in the HTML
    const match = html.match(/https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-?&=_]+/);
    if (match) {
      // Clean query parameters to keep only the base URL
      const cleanUrl = match[0].split('?')[0];
      console.log(`"${key}": "${cleanUrl}?q=80&w=800&auto=format&fit=crop",`);
    } else {
      console.log(`"${key}": failed to find image URL in HTML`);
    }
  } catch (e) {
    console.log(`"${key}" failed: ${e.message}`);
  }
}
