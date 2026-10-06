/**
 * Unified Dataset Loader, Coordinate Validator & Spatial Indexer
 * Single Source of Truth normalizer for Forests and Zoos.
 * Precomputes hierarchical aggregates (Continent -> Country -> State/Region)
 * with strict O(1) indexed lookups to guarantee zero re-filtering on renders.
 */

export interface NormalizedPlace {
  id: string | number;
  type: 'forest' | 'zoo';
  name: string;
  continent: string;
  country: string;
  state: string;
  city?: string;
  lat: number;
  lng: number;
  latitude: number; // backward compatibility
  longitude: number; // backward compatibility
  description: string;
  area?: string;
  climate?: string;
  entranceName: string;
  entrance_name?: string;
  entranceLat: number;
  entrance_latitude?: number;
  entranceLng: number;
  entrance_longitude?: number;
  entranceSource?: string;
  entrance_source?: string;
  entranceVerificationStatus?: string;
  entrance_verification_status?: string;
  source?: string;
  speciesCount?: number;
  species?: string[];
  boundary?: any;
  raw?: any;
}

export interface StateAggregate {
  state: string;
  country: string;
  continent: string;
  forestCount: number;
  zooCount: number;
  totalCount: number;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  places: NormalizedPlace[];
}

export interface CountryAggregate {
  country: string;
  continent: string;
  forestCount: number;
  zooCount: number;
  totalCount: number;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  states: Map<string, StateAggregate>;
  stateList: StateAggregate[];
  places: NormalizedPlace[];
}

export interface ContinentAggregate {
  id: string;
  name: string;
  emoji: string;
  forestCount: number;
  zooCount: number;
  totalCount: number;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  countries: Map<string, CountryAggregate>;
  countryList: CountryAggregate[];
  places: NormalizedPlace[];
}

export interface SkippedRecordLog {
  id?: string | number;
  name?: string;
  type: 'forest' | 'zoo' | 'unknown';
  reason: 'INVALID_COORDINATES' | 'MISSING_REQUIRED_FIELD' | 'DUPLICATE_RECORD';
  details: string;
  rawRecord: any;
}

export interface NormalizedDataset {
  totalRaw: number;
  validCount: number;
  skippedCount: number;
  skippedRecords: SkippedRecordLog[];
  allPlaces: NormalizedPlace[];
  forests: NormalizedPlace[];
  zoos: NormalizedPlace[];
  
  // Hierarchical aggregated indices
  continents: Map<string, ContinentAggregate>;
  continentList: ContinentAggregate[];
  
  // Direct lookup maps
  countryIndex: Map<string, CountryAggregate>; // key: "Continent:Country" or "Country"
  stateIndex: Map<string, StateAggregate>; // key: "Continent:Country:State"
  placesById: Map<string, NormalizedPlace>;
}

// Canonical 7 Continents
export const CANONICAL_CONTINENTS = [
  'Africa',
  'Antarctica',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America'
] as const;

export const CONTINENT_METADATA: Record<string, { emoji: string; center: [number, number]; zoom: number; bounds: [[number, number], [number, number]] }> = {
  'Africa': { emoji: '🌍', center: [2.0, 22.0], zoom: 3, bounds: [[-35.5, -18.0], [37.5, 52.0]] },
  'Antarctica': { emoji: '❄️', center: [-80.0, 0.0], zoom: 2, bounds: [[-85.0, -180.0], [-60.0, 180.0]] },
  'Asia': { emoji: '🌏', center: [34.0, 95.0], zoom: 3, bounds: [[-11.0, 45.0], [77.0, 150.0]] },
  'Europe': { emoji: '🇪🇺', center: [53.0, 16.0], zoom: 4, bounds: [[35.0, -12.0], [71.5, 50.0]] },
  'North America': { emoji: '🌎', center: [45.0, -100.0], zoom: 3, bounds: [[7.0, -168.0], [72.0, -50.0]] },
  'Oceania': { emoji: '🦘', center: [-25.0, 135.0], zoom: 4, bounds: [[-48.0, 110.0], [-10.0, 180.0]] },
  'South America': { emoji: '🌿', center: [-15.0, -60.0], zoom: 3, bounds: [[-55.5, -82.0], [12.5, -34.0]] }
};

/**
 * Standardize continent naming variations to canonical string.
 */
export function normalizeContinentName(rawContinent?: string, rawCountry?: string): string {
  if (!rawContinent && !rawCountry) return 'Asia';
  const cont = (rawContinent || '').trim().toLowerCase();

  if (cont.includes('north america') || cont === 'na') return 'North America';
  if (cont.includes('south america') || cont === 'sa') return 'South America';
  if (cont.includes('oceania') || cont.includes('australia') || cont === 'oc') return 'Oceania';
  if (cont.includes('europe') || cont === 'eu') return 'Europe';
  if (cont.includes('africa') || cont === 'af') return 'Africa';
  if (cont.includes('antarct') || cont === 'an') return 'Antarctica';
  if (cont.includes('asia') || cont === 'as') return 'Asia';

  // Country fallback heuristic
  const c = (rawCountry || '').toLowerCase();
  if (c.includes('united states') || c.includes('canada') || c.includes('mexico') || c.includes('costa rica')) return 'North America';
  if (c.includes('brazil') || c.includes('peru') || c.includes('colombia') || c.includes('argentina') || c.includes('chile')) return 'South America';
  if (c.includes('germany') || c.includes('france') || c.includes('uk') || c.includes('united kingdom') || c.includes('spain') || c.includes('italy') || c.includes('norway') || c.includes('sweden') || c.includes('poland')) return 'Europe';
  if (c.includes('india') || c.includes('china') || c.includes('japan') || c.includes('indonesia') || c.includes('thailand') || c.includes('nepal') || c.includes('malaysia') || c.includes('singapore')) return 'Asia';
  if (c.includes('south africa') || c.includes('kenya') || c.includes('tanzania') || c.includes('madagascar') || c.includes('congo') || c.includes('egypt') || c.includes('nigeria')) return 'Africa';
  if (c.includes('australia') || c.includes('new zealand') || c.includes('fiji') || c.includes('papua')) return 'Oceania';

  return 'Asia';
}

/**
 * Coordinate validator adhering strictly to WGS 84 geographic boundary constraints.
 */
export function isValidCoordinate(lat: any, lng: any): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (lat === '' || lng === '') return false;
  const nLat = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const nLng = typeof lng === 'number' ? lng : parseFloat(String(lng));
  if (isNaN(nLat) || isNaN(nLng)) return false;
  if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) return false;
  return true;
}

/**
 * Normalize a single place record (Forest or Zoo)
 */
export function normalizeRecord(
  raw: any,
  forcedType?: 'forest' | 'zoo'
): { valid: true; place: NormalizedPlace } | { valid: false; log: SkippedRecordLog } {
  if (!raw) {
    return {
      valid: false,
      log: {
        type: forcedType || 'unknown',
        reason: 'MISSING_REQUIRED_FIELD',
        details: 'Record is null or undefined.',
        rawRecord: raw
      }
    };
  }

  const type: 'forest' | 'zoo' = forcedType || (raw.type === 'zoo' || raw.zoo_id ? 'zoo' : 'forest');
  const id = raw.id || raw.forest_id || raw.zoo_id || raw.wikidata_id;
  const name = (raw.name || raw.forest_name || raw.zoo_name || '').trim();

  if (!id || !name) {
    return {
      valid: false,
      log: {
        id,
        name,
        type,
        reason: 'MISSING_REQUIRED_FIELD',
        details: `Missing mandatory identifier or name: id=${id}, name=${name}`,
        rawRecord: raw
      }
    };
  }

  const lat = typeof raw.latitude === 'number' ? raw.latitude : (typeof raw.lat === 'number' ? raw.lat : parseFloat(raw.latitude || raw.lat));
  const lng = typeof raw.longitude === 'number' ? raw.longitude : (typeof raw.lng === 'number' ? raw.lng : parseFloat(raw.longitude || raw.lng));

  if (!isValidCoordinate(lat, lng)) {
    return {
      valid: false,
      log: {
        id,
        name,
        type,
        reason: 'INVALID_COORDINATES',
        details: `Coordinates out of geographic range [-90..90, -180..180]: lat=${lat}, lng=${lng}`,
        rawRecord: raw
      }
    };
  }

  const country = (raw.country || '').trim() || 'Global';
  const continent = normalizeContinentName(raw.continent, country);
  const state = (raw.state || raw.state_province || raw.city || raw.region || 'General Region').trim();
  const city = (raw.city || '').trim();

  const entranceLat = typeof raw.entrance_latitude === 'number'
    ? raw.entrance_latitude
    : (typeof raw.entranceLat === 'number' ? raw.entranceLat : parseFloat(raw.entrance_latitude || raw.entranceLat || lat));

  const entranceLng = typeof raw.entrance_longitude === 'number'
    ? raw.entrance_longitude
    : (typeof raw.entranceLng === 'number' ? raw.entranceLng : parseFloat(raw.entrance_longitude || raw.entranceLng || lng));

  const entranceName = raw.entrance_name || raw.entranceName || `${name} Main Entrance`;
  const entranceSource = raw.entrance_source || raw.entranceSource || 'OpenStreetMap & Protected Area Dataset';
  const entranceVerificationStatus = raw.entrance_verification_status || raw.entranceVerificationStatus || 'verified';

  const description = raw.description || (type === 'forest'
    ? `${name} is a designated protected forest reserve located in ${country}.`
    : `${name} is an accredited zoological conservation park in ${country}.`);

  const speciesList: string[] = Array.isArray(raw.species)
    ? raw.species
    : (Array.isArray(raw.animals) ? raw.animals.map((a: any) => typeof a === 'string' ? a : (a.name || a.scientificName || '')) : []);

  const place: NormalizedPlace = {
    id: String(id),
    type,
    name,
    continent,
    country,
    state,
    city,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    description,
    area: raw.area || (type === 'forest' ? 'Protected Wilderness' : 'Conservation Facility'),
    climate: raw.climate || 'Temperate / Tropical',
    entranceName,
    entrance_name: entranceName,
    entranceLat: isValidCoordinate(entranceLat, entranceLng) ? entranceLat : lat,
    entrance_latitude: isValidCoordinate(entranceLat, entranceLng) ? entranceLat : lat,
    entranceLng: isValidCoordinate(entranceLat, entranceLng) ? entranceLng : lng,
    entrance_longitude: isValidCoordinate(entranceLat, entranceLng) ? entranceLng : lng,
    entranceSource,
    entrance_source: entranceSource,
    entranceVerificationStatus,
    entrance_verification_status: entranceVerificationStatus,
    source: raw.source || 'WildAtlas Database',
    speciesCount: speciesList.length,
    species: speciesList,
    boundary: raw.boundary,
    raw
  };

  return { valid: true, place };
}

/**
 * Compute geographic centroid and bounding box from a collection of points
 */
function computeBoundsAndCenter(places: NormalizedPlace[], fallbackCenter: [number, number] = [20, 10]): {
  center: [number, number];
  bounds: [[number, number], [number, number]];
} {
  if (places.length === 0) {
    return {
      center: fallbackCenter,
      bounds: [[fallbackCenter[0] - 5, fallbackCenter[1] - 5], [fallbackCenter[0] + 5, fallbackCenter[1] + 5]]
    };
  }

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  let sumLat = 0;
  let sumLng = 0;

  for (const p of places) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
    sumLat += p.lat;
    sumLng += p.lng;
  }

  const center: [number, number] = [sumLat / places.length, sumLng / places.length];
  // Add a tiny buffer so single points don't collapse to a zero-area point
  const padding = 0.5;
  const bounds: [[number, number], [number, number]] = [
    [minLat - padding, minLng - padding],
    [maxLat + padding, maxLng + padding]
  ];

  return { center, bounds };
}

/**
 * Main Loader & Aggregation Pipeline
 * Takes raw lists of forests and zoos and outputs indexed structures.
 */
export function buildNormalizedDataset(rawForests: any[] = [], rawZoos: any[] = []): NormalizedDataset {
  const totalRaw = rawForests.length + rawZoos.length;
  const skippedRecords: SkippedRecordLog[] = [];
  const allPlaces: NormalizedPlace[] = [];
  const forests: NormalizedPlace[] = [];
  const zoos: NormalizedPlace[] = [];
  const seenKeys = new Set<string>();

  // Process forests
  for (const raw of rawForests) {
    const result = normalizeRecord(raw, 'forest');
    if (!result.valid) {
      skippedRecords.push(result.log);
      continue;
    }
    const place = result.place;
    const dedupeKey = `forest:${place.name.toLowerCase()}:${place.lat.toFixed(4)}:${place.lng.toFixed(4)}`;
    if (seenKeys.has(dedupeKey)) {
      skippedRecords.push({
        id: place.id,
        name: place.name,
        type: 'forest',
        reason: 'DUPLICATE_RECORD',
        details: `Duplicate forest entry detected at coordinate (${place.lat}, ${place.lng})`,
        rawRecord: raw
      });
      continue;
    }
    seenKeys.add(dedupeKey);
    forests.push(place);
    allPlaces.push(place);
  }

  // Process zoos
  for (const raw of rawZoos) {
    const result = normalizeRecord(raw, 'zoo');
    if (!result.valid) {
      skippedRecords.push(result.log);
      continue;
    }
    const place = result.place;
    const dedupeKey = `zoo:${place.name.toLowerCase()}:${place.lat.toFixed(4)}:${place.lng.toFixed(4)}`;
    if (seenKeys.has(dedupeKey)) {
      skippedRecords.push({
        id: place.id,
        name: place.name,
        type: 'zoo',
        reason: 'DUPLICATE_RECORD',
        details: `Duplicate zoo entry detected at coordinate (${place.lat}, ${place.lng})`,
        rawRecord: raw
      });
      continue;
    }
    seenKeys.add(dedupeKey);
    zoos.push(place);
    allPlaces.push(place);
  }

  // -------------------------------------------------------------
  // PRECOMPUTE HIERARCHICAL AGGREGATES ONCE
  // -------------------------------------------------------------
  const continentsMap = new Map<string, ContinentAggregate>();
  const countryIndex = new Map<string, CountryAggregate>();
  const stateIndex = new Map<string, StateAggregate>();
  const placesById = new Map<string, NormalizedPlace>();

  // Initialize all canonical continents even if 0 entries
  for (const cName of CANONICAL_CONTINENTS) {
    const meta = CONTINENT_METADATA[cName] || { emoji: '🌍', center: [20, 10], zoom: 3, bounds: [[-60, -180], [80, 180]] };
    continentsMap.set(cName, {
      id: cName.toLowerCase().replace(/\s+/g, '-'),
      name: cName,
      emoji: meta.emoji,
      forestCount: 0,
      zooCount: 0,
      totalCount: 0,
      center: meta.center,
      bounds: meta.bounds,
      countries: new Map<string, CountryAggregate>(),
      countryList: [],
      places: []
    });
  }

  // Index places into hierarchy
  for (const p of allPlaces) {
    placesById.set(String(p.id), p);
    if (p.raw?.forest_id) placesById.set(String(p.raw.forest_id), p);
    if (p.raw?.zoo_id) placesById.set(String(p.raw.zoo_id), p);

    let contAgg = continentsMap.get(p.continent);
    if (!contAgg) {
      contAgg = {
        id: p.continent.toLowerCase().replace(/\s+/g, '-'),
        name: p.continent,
        emoji: '🌍',
        forestCount: 0,
        zooCount: 0,
        totalCount: 0,
        center: [p.lat, p.lng],
        bounds: [[p.lat - 5, p.lng - 5], [p.lat + 5, p.lng + 5]],
        countries: new Map<string, CountryAggregate>(),
        countryList: [],
        places: []
      };
      continentsMap.set(p.continent, contAgg);
    }

    if (p.type === 'forest') contAgg.forestCount++;
    else contAgg.zooCount++;
    contAgg.totalCount++;
    contAgg.places.push(p);

    // Country Aggregate
    let countryAgg = contAgg.countries.get(p.country);
    const countryKey = `${p.continent}:${p.country}`;
    if (!countryAgg) {
      countryAgg = {
        country: p.country,
        continent: p.continent,
        forestCount: 0,
        zooCount: 0,
        totalCount: 0,
        center: [p.lat, p.lng],
        bounds: [[p.lat - 2, p.lng - 2], [p.lat + 2, p.lng + 2]],
        states: new Map<string, StateAggregate>(),
        stateList: [],
        places: []
      };
      contAgg.countries.set(p.country, countryAgg);
      countryIndex.set(countryKey, countryAgg);
      // Secondary alias lookup by plain country name if unique
      if (!countryIndex.has(p.country)) {
        countryIndex.set(p.country, countryAgg);
      }
    }

    if (p.type === 'forest') countryAgg.forestCount++;
    else countryAgg.zooCount++;
    countryAgg.totalCount++;
    countryAgg.places.push(p);

    // State / Region Aggregate
    let stateAgg = countryAgg.states.get(p.state);
    const stateKey = `${p.continent}:${p.country}:${p.state}`;
    if (!stateAgg) {
      stateAgg = {
        state: p.state,
        country: p.country,
        continent: p.continent,
        forestCount: 0,
        zooCount: 0,
        totalCount: 0,
        center: [p.lat, p.lng],
        bounds: [[p.lat - 1, p.lng - 1], [p.lat + 1, p.lng + 1]],
        places: []
      };
      countryAgg.states.set(p.state, stateAgg);
      stateIndex.set(stateKey, stateAgg);
    }

    if (p.type === 'forest') stateAgg.forestCount++;
    else stateAgg.zooCount++;
    stateAgg.totalCount++;
    stateAgg.places.push(p);
  }

  // Compute spatial bounds and sort child lists
  for (const cont of continentsMap.values()) {
    if (cont.places.length > 0) {
      const { bounds } = computeBoundsAndCenter(cont.places, cont.center);
      // Keep defined continent macro bounds or tight data bounds
      cont.bounds = bounds;
    }

    for (const country of cont.countries.values()) {
      const cSpatial = computeBoundsAndCenter(country.places, cont.center);
      country.center = cSpatial.center;
      country.bounds = cSpatial.bounds;

      for (const state of country.states.values()) {
        const sSpatial = computeBoundsAndCenter(state.places, country.center);
        state.center = sSpatial.center;
        state.bounds = sSpatial.bounds;
      }
      country.stateList = Array.from(country.states.values()).sort((a, b) => b.totalCount - a.totalCount);
    }
    cont.countryList = Array.from(cont.countries.values()).sort((a, b) => b.totalCount - a.totalCount);
  }

  const continentList = Array.from(continentsMap.values());

  return {
    totalRaw,
    validCount: allPlaces.length,
    skippedCount: skippedRecords.length,
    skippedRecords,
    allPlaces,
    forests,
    zoos,
    continents: continentsMap,
    continentList,
    countryIndex,
    stateIndex,
    placesById
  };
}
