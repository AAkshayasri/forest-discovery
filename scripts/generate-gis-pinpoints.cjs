const fs = require('fs');
const path = require('path');

function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = result[idx] || '';
    });
    rows.push(obj);
  }
  return rows;
}

const forestsCSV = fs.readFileSync(path.join(__dirname, '../forests_processed.csv'), 'utf8');
const zoosCSV = fs.readFileSync(path.join(__dirname, '../zoos_processed.csv'), 'utf8');

const forests = parseCSV(forestsCSV);
const zoos = parseCSV(zoosCSV);

console.log(`Loaded ${forests.length} forests and ${zoos.length} zoos.`);

const natureImages = [
  'https://images.unsplash.com/photo-1511497584788-87676104235f?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=800&auto=format&fit=crop'
];

const zooImages = [
  'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1570776735234-a0352ef2eb5b?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&auto=format&fit=crop'
];

const allPinpoints = [];

// 1. Add all Forest pinpoints from Explorer
forests.forEach((f, idx) => {
  const lat = parseFloat(f.latitude);
  const lng = parseFloat(f.longitude);
  if (isNaN(lat) || isNaN(lng)) return;
  
  // Status: assign Active, Developing, or Proposed based on index/state
  const statuses = ['Active', 'Active', 'Developing', 'Proposed'];
  const status = statuses[idx % statuses.length];
  
  const threatLevels = ['Low', 'Moderate', 'High', 'Critical'];
  const threat = threatLevels[idx % threatLevels.length];

  const categories = [
    'Biosphere Reserve',
    'National Park',
    'Wildlife Reserve',
    'Reforestation Zone',
    'Ecological Corridor'
  ];
  const category = categories[idx % categories.length];

  allPinpoints.push({
    id: `forest-${f.forest_id || idx + 1}`,
    name: f.forest_name,
    category: category,
    status: status,
    latitude: lat,
    longitude: lng,
    country: f.country || 'Global',
    region: f.continent || f.state_province || 'Protected Area',
    areaKm2: 2500 + ((idx * 370) % 85000),
    establishedYear: 1950 + (idx % 70),
    speciesCount: 650 + ((idx * 140) % 12000),
    rangerTeams: 8 + ((idx * 3) % 65),
    threatLevel: threat,
    description: `Protected ${f.climate || 'forest'} wilderness sanctuary located in ${f.country || f.continent}. Coordinates mapped from WildAtlas Explorer database.`,
    tags: ['Forest', f.continent, f.climate, f.state_province].filter(Boolean),
    imageUrl: natureImages[idx % natureImages.length]
  });
});

// 2. Add all Zoo pinpoints from Explorer
zoos.forEach((z, idx) => {
  const lat = parseFloat(z.latitude);
  const lng = parseFloat(z.longitude);
  if (isNaN(lat) || isNaN(lng)) return;

  const statuses = ['Active', 'Developing', 'Active'];
  const status = statuses[idx % statuses.length];

  allPinpoints.push({
    id: `zoo-${z.zoo_id || idx + 1}`,
    name: z.zoo_name,
    category: 'Wildlife Sanctuary',
    status: status,
    latitude: lat,
    longitude: lng,
    country: z.country || 'Global',
    region: z.continent || z.city || 'Zoological Reserve',
    areaKm2: 120 + ((idx * 25) % 800),
    establishedYear: 1930 + (idx % 90),
    speciesCount: 450 + ((idx * 85) % 4500),
    rangerTeams: 15 + ((idx * 4) % 50),
    threatLevel: 'Low',
    description: z.notable_species || `Verified zoological and wildlife conservation center in ${z.city ? z.city + ', ' : ''}${z.country}.`,
    tags: ['Zoo', 'Sanctuary', z.continent, z.city].filter(Boolean),
    imageUrl: zooImages[idx % zooImages.length]
  });
});

console.log(`Generated total ${allPinpoints.length} GIS pinpoints from Explorer.`);

const fileContent = `export type MarkerStatus = 'Active' | 'Developing' | 'Proposed';

export interface GISLocation {
  id: string | number;
  name: string;
  category: 'National Park' | 'Biosphere Reserve' | 'Marine Sanctuary' | 'Wildlife Reserve' | 'Reforestation Zone' | 'Ecological Corridor' | 'Wildlife Sanctuary' | string;
  status: MarkerStatus;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  areaKm2: number;
  establishedYear: number;
  speciesCount: number;
  rangerTeams: number;
  threatLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  description: string;
  tags: string[];
  imageUrl: string;
}

// Complete pinpoints copied and mapped directly from WildAtlas Explorer (Forests & Zoos)
export const INITIAL_GIS_LOCATIONS: GISLocation[] = ${JSON.stringify(allPinpoints, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../client/src/components/map/gisMockData.ts'), fileContent, 'utf8');
console.log('Successfully updated client/src/components/map/gisMockData.ts with all Explorer pinpoints!');
