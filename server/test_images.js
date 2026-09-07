import fetch from 'node-fetch';

const SPECIES_IMAGE_MAP = {
  "tiger": "https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?q=80&w=800&auto=format&fit=crop",
  "jaguar": "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?q=80&w=800&auto=format&fit=crop",
  "lion": "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&auto=format&fit=crop",
  "elephant": "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?q=80&w=800&auto=format&fit=crop",
  "red panda": "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800&auto=format&fit=crop",
  "gorilla": "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?q=80&w=800&auto=format&fit=crop",
  "panda": "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?q=80&w=800&auto=format&fit=crop",
  "sloth": "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=800&auto=format&fit=crop",
  "capybara": "https://images.unsplash.com/photo-1561948955-570b270e7c36?q=80&w=800&auto=format&fit=crop",
  "kangaroo": "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=800&auto=format&fit=crop",
  "koala": "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&auto=format&fit=crop",
  "leopard": "https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?q=80&w=800&auto=format&fit=crop",
  "snow leopard": "https://images.unsplash.com/photo-1606856094753-ff224e5e55e8?q=80&w=800&auto=format&fit=crop",
  "deer": "https://images.unsplash.com/photo-1484406566174-9da000fda645?q=80&w=800&auto=format&fit=crop",
  "wolf": "https://images.unsplash.com/photo-1590424753054-3248196627f9?q=80&w=800&auto=format&fit=crop",
  "fox": "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=800&auto=format&fit=crop",
  "bear": "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?q=80&w=800&auto=format&fit=crop",
  "polar bear": "https://images.unsplash.com/photo-1589656966895-2f33e7653819?q=80&w=800&auto=format&fit=crop",
  "toucan": "https://images.unsplash.com/photo-1589656966895-2f33e7653819?q=80&w=800&auto=format&fit=crop",
  "macaw": "https://images.unsplash.com/photo-1484557985045-edf25e08da73?q=80&w=800&auto=format&fit=crop",
  "hornbill": "https://images.unsplash.com/photo-1591821099449-c290c0a59918?q=80&w=800&auto=format&fit=crop",
  "owl": "https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=800&auto=format&fit=crop",
  "eagle": "https://images.unsplash.com/photo-1611689342806-0863700ce1e4?q=80&w=800&auto=format&fit=crop",
  "king cobra": "https://images.unsplash.com/photo-1531386151447-fd76ad50012f?q=80&w=800&auto=format&fit=crop",
  "python": "https://images.unsplash.com/photo-1528156423985-5e3687b9a5eb?q=80&w=800&auto=format&fit=crop",
  "anaconda": "https://images.unsplash.com/photo-1604608678051-64d46d8d0ffe?q=80&w=800&auto=format&fit=crop",
  "crocodile": "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?q=80&w=800&auto=format&fit=crop",
  "chameleon": "https://images.unsplash.com/photo-1504450758481-7338ef7524a7?q=80&w=800&auto=format&fit=crop"
};

for (const [key, url] of Object.entries(SPECIES_IMAGE_MAP)) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`${key}: ${res.status}`);
  } catch (e) {
    console.log(`${key} failed: ${e.message}`);
  }
}
