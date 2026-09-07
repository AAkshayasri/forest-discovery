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
  const url = `https://images.unsplash.com/photo-${id}?q=80&w=800&auto=format&fit=crop`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`${key} (photo-${id}): ${res.status}`);
  } catch (e) {
    console.log(`${key} failed: ${e.message}`);
  }
}
