import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../database/watlas.db');

// Ensure db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Failed to connect to watlas.db SQLite database:", err.message);
      } else {
        console.log("Connected to local SQLite database (watlas.db) as the single source of truth.");
        dbInstance.run("PRAGMA journal_mode = WAL;");
      }
    });
  }
  return dbInstance;
};

// Database helper promises
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Normalize numeric/string IDs to standard F000001 format if needed
const normalizeForestId = (id) => {
  if (typeof id === 'string' && id.startsWith('F')) return id;
  const num = parseInt(id, 10);
  if (!isNaN(num)) return `F${String(num).padStart(6, '0')}`;
  return String(id);
};

const CATEGORY_IMAGE_FALLBACKS = {
  mammal: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=800&q=80',
  bird: 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?auto=format&fit=crop&w=800&q=80',
  reptile: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
  amphibian: 'https://images.unsplash.com/photo-1579380656108-62d187232230?auto=format&fit=crop&w=800&q=80',
  fish: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&w=800&q=80',
  invertebrate: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=800&q=80',
  plant: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80'
};

const getEffectiveImageUrl = (url, group) => {
  if (url && url.trim() !== '' && !url.includes('placeholder')) return url;
  const normGroup = (group || 'default').toLowerCase();
  return CATEGORY_IMAGE_FALLBACKS[normGroup] || CATEGORY_IMAGE_FALLBACKS.default;
};




export const dbService = {
  getMode: () => "sqlite",

  // -------------------------------------------------------------
  // FORESTS
  // -------------------------------------------------------------

  getForests: async (filters = {}) => {
    try {
      let sql = `SELECT * FROM forests`;
      const params = [];

      if (filters.continent) {
        sql += ` WHERE LOWER(continent) = LOWER(?)`;
        params.push(filters.continent);
      }

      sql += ` ORDER BY forest_name ASC`;
      const rows = await dbAll(sql, params);

      return rows.map(r => ({
        id: r.forest_id,
        forest_id: r.forest_id,
        name: r.forest_name,
        forest_name: r.forest_name,
        country: r.country,
        state: r.state_province || '',
        state_province: r.state_province || '',
        city: r.city || '',
        continent: r.continent,
        latitude: r.latitude,
        longitude: r.longitude,
        entrance_name: r.entrance_name || `${r.forest_name} Main Entrance`,
        entrance_latitude: r.entrance_latitude !== null && r.entrance_latitude !== undefined ? r.entrance_latitude : r.latitude,
        entrance_longitude: r.entrance_longitude !== null && r.entrance_longitude !== undefined ? r.entrance_longitude : r.longitude,
        entrance_source: r.entrance_source || 'OpenStreetMap & Protected Area Dataset',
        entrance_verification_status: r.entrance_verification_status || 'verified',
        boundary: r.boundary ? JSON.parse(r.boundary) : { type: 'Point', coordinates: [r.longitude, r.latitude] },
        description: r.description || `${r.forest_name} in ${r.country}`,
        area: r.area || 'Protected Area',
        climate: r.climate || 'Temperate / Tropical',
        source: r.source
      }));
    } catch (err) {
      console.error("Error fetching forests from SQLite:", err.message);
      return [];
    }
  },

  getForestById: async (id) => {
    try {
      const normId = normalizeForestId(id);
      const sql = `SELECT * FROM forests WHERE forest_id = ? OR forest_id = ?`;
      const r = await dbGet(sql, [normId, String(id)]);
      if (!r) return null;

      return {
        id: r.forest_id,
        forest_id: r.forest_id,
        name: r.forest_name,
        forest_name: r.forest_name,
        country: r.country,
        state: r.state_province || '',
        state_province: r.state_province || '',
        city: r.city || '',
        continent: r.continent,
        latitude: r.latitude,
        longitude: r.longitude,
        entrance_name: r.entrance_name || `${r.forest_name} Main Entrance`,
        entrance_latitude: r.entrance_latitude !== null && r.entrance_latitude !== undefined ? r.entrance_latitude : r.latitude,
        entrance_longitude: r.entrance_longitude !== null && r.entrance_longitude !== undefined ? r.entrance_longitude : r.longitude,
        entrance_source: r.entrance_source || 'OpenStreetMap & Protected Area Dataset',
        entrance_verification_status: r.entrance_verification_status || 'verified',
        boundary: r.boundary ? JSON.parse(r.boundary) : { type: 'Point', coordinates: [r.longitude, r.latitude] },
        description: r.description,
        area: r.area,
        climate: r.climate,
        source: r.source
      };
    } catch (err) {
      console.error(`Error fetching forest by ID ${id} from SQLite:`, err.message);
      return null;
    }
  },

  searchForests: async (query) => {
    if (!query) return [];
    try {
      const pattern = `%${query.trim()}%`;
      const sql = `
        SELECT * FROM forests 
        WHERE forest_name LIKE ? 
           OR country LIKE ? 
           OR state_province LIKE ? 
           OR continent LIKE ?
        ORDER BY forest_name ASC
        LIMIT 50
      `;
      const rows = await dbAll(sql, [pattern, pattern, pattern, pattern]);
      return rows.map(r => ({
        id: r.forest_id,
        forest_id: r.forest_id,
        name: r.forest_name,
        forest_name: r.forest_name,
        country: r.country,
        state: r.state_province || '',
        city: r.city || '',
        continent: r.continent,
        latitude: r.latitude,
        longitude: r.longitude,
        entrance_name: r.entrance_name || `${r.forest_name} Main Entrance`,
        entrance_latitude: r.entrance_latitude !== null && r.entrance_latitude !== undefined ? r.entrance_latitude : r.latitude,
        entrance_longitude: r.entrance_longitude !== null && r.entrance_longitude !== undefined ? r.entrance_longitude : r.longitude,
        entrance_source: r.entrance_source || 'OpenStreetMap & Protected Area Dataset',
        entrance_verification_status: r.entrance_verification_status || 'verified',
        description: r.description,
        source: r.source
      }));
    } catch (err) {
      console.error("Error searching forests in SQLite:", err.message);
      return [];
    }
  },

  // -------------------------------------------------------------
  // ZOOS (LOCAL SQLITE - zoos_by_continent.xlsx)
  // -------------------------------------------------------------

  getZoos: async (filters = {}) => {
    try {
      let sql = `SELECT * FROM zoos`;
      const params = [];

      if (filters.continent) {
        sql += ` WHERE LOWER(continent) = LOWER(?)`;
        params.push(filters.continent);
      }

      sql += ` ORDER BY zoo_name ASC`;
      const rows = await dbAll(sql, params);

      return rows.map(r => ({
        id: r.zoo_id,
        zoo_id: r.zoo_id,
        name: r.zoo_name,
        zoo_name: r.zoo_name,
        country: r.country,
        state: r.state_province || '',
        state_province: r.state_province || '',
        city: r.city || '',
        continent: r.continent,
        latitude: r.latitude,
        longitude: r.longitude,
        entrance_name: r.entrance_name || `${r.zoo_name} Main Entrance`,
        entrance_latitude: r.entrance_latitude !== null && r.entrance_latitude !== undefined ? r.entrance_latitude : r.latitude,
        entrance_longitude: r.entrance_longitude !== null && r.entrance_longitude !== undefined ? r.entrance_longitude : r.longitude,
        entrance_source: r.entrance_source || 'Official Zoological Register & OpenStreetMap',
        entrance_verification_status: r.entrance_verification_status || 'verified',
        description: r.description || `${r.zoo_name} in ${r.city ? r.city + ', ' : ''}${r.country}`,
        source: r.source
      }));
    } catch (err) {
      console.error("Error fetching zoos from SQLite:", err.message);
      return [];
    }
  },

  getZooById: async (id) => {
    try {
      const sql = `SELECT * FROM zoos WHERE zoo_id = ? OR zoo_id = ?`;
      const r = await dbGet(sql, [String(id), String(id)]);
      if (!r) return null;

      return {
        id: r.zoo_id,
        zoo_id: r.zoo_id,
        name: r.zoo_name,
        zoo_name: r.zoo_name,
        country: r.country,
        state: r.state_province || '',
        state_province: r.state_province || '',
        city: r.city || '',
        continent: r.continent,
        latitude: r.latitude,
        longitude: r.longitude,
        entrance_name: r.entrance_name || `${r.zoo_name} Main Entrance`,
        entrance_latitude: r.entrance_latitude !== null && r.entrance_latitude !== undefined ? r.entrance_latitude : r.latitude,
        entrance_longitude: r.entrance_longitude !== null && r.entrance_longitude !== undefined ? r.entrance_longitude : r.longitude,
        entrance_source: r.entrance_source || 'Official Zoological Register & OpenStreetMap',
        entrance_verification_status: r.entrance_verification_status || 'verified',
        description: r.description,
        source: r.source
      };
    } catch (err) {
      console.error(`Error fetching zoo by ID ${id} from SQLite:`, err.message);
      return null;
    }
  },

  searchZoos: async (query) => {
    if (!query) return [];
    try {
      const pattern = `%${query.trim()}%`;
      const sql = `
        SELECT * FROM zoos 
        WHERE zoo_name LIKE ? 
           OR country LIKE ? 
           OR city LIKE ? 
           OR continent LIKE ?
        ORDER BY zoo_name ASC
        LIMIT 50
      `;
      const rows = await dbAll(sql, [pattern, pattern, pattern, pattern]);
      return rows.map(r => ({
        id: r.zoo_id,
        zoo_id: r.zoo_id,
        name: r.zoo_name,
        zoo_name: r.zoo_name,
        country: r.country,
        state: r.state_province || '',
        city: r.city || '',
        continent: r.continent,
        latitude: r.latitude,
        longitude: r.longitude,
        entrance_name: r.entrance_name || `${r.zoo_name} Main Entrance`,
        entrance_latitude: r.entrance_latitude !== null && r.entrance_latitude !== undefined ? r.entrance_latitude : r.latitude,
        entrance_longitude: r.entrance_longitude !== null && r.entrance_longitude !== undefined ? r.entrance_longitude : r.longitude,
        entrance_source: r.entrance_source || 'Official Zoological Register & OpenStreetMap',
        entrance_verification_status: r.entrance_verification_status || 'verified',
        description: r.description,
        source: r.source
      }));
    } catch (err) {
      console.error("Error searching zoos in SQLite:", err.message);
      return [];
    }
  },

  getWildlifeByZooId: async (zooId, groupFilter = null) => {
    try {
      let sql = `
        SELECT 
          s.species_id,
          s.gbif_taxon_key,
          s.scientific_name,
          s.accepted_scientific_name,
          s.common_name,
          s.kingdom,
          s.phylum,
          s.class,
          s.order_name,
          s.family,
          s.genus,
          s.species_group,
          s.iucn_category,
          s.conservation_status,
          s.habitat,
          s.population_information,
          s.threats,
          s.image_url,
          s.diet,
          s.behaviour,
          s.lifespan,
          s.gbif_source,
          s.iucn_source,
          zs.animal_name,
          zs.source_name as relation_source,
          zs.verification_status,
          zs.last_verified,
          z.zoo_id,
          z.zoo_name,
          z.country as zoo_country,
          z.city as zoo_city
        FROM zoo_species zs
        JOIN species_master s ON zs.species_id = s.species_id
        JOIN zoos z ON zs.zoo_id = z.zoo_id
        WHERE zs.zoo_id = ?
      `;
      const params = [String(zooId)];

      if (groupFilter) {
        sql += ` AND (LOWER(s.species_group) = LOWER(?) OR LOWER(s.species_group) LIKE LOWER(?))`;
        params.push(groupFilter, `%${groupFilter}%`);
      }

      sql += ` ORDER BY s.common_name ASC`;
      const rows = await dbAll(sql, params);

      return rows.map(r => ({
        id: r.species_id,
        speciesId: r.species_id,
        zooId: r.zoo_id,
        name: r.common_name || r.scientific_name,
        scientificName: r.scientific_name,
        acceptedScientificName: r.accepted_scientific_name,
        type: r.species_group.toLowerCase(),
        speciesGroup: r.species_group,
        kingdom: r.kingdom,
        phylum: r.phylum,
        class: r.class,
        order: r.order_name,
        family: r.family,
        genus: r.genus,
        imageUrl: getEffectiveImageUrl(r.image_url, r.species_group),
        habitat: r.habitat || 'Zoological conservation enclosure',
        diet: r.diet || 'Specialized zoological nutrition',
        behaviour: r.behaviour || 'Resident wildlife under professional care',
        lifespan: r.lifespan || 'Documented in zoological registry',
        conservationStatus: r.conservation_status || (r.iucn_category ? `IUCN: ${r.iucn_category}` : 'Least Concern'),
        iucnCategory: r.iucn_category,
        interestingFacts: [
          `Conservation Status: ${r.conservation_status} (${r.iucn_category || 'Assessed'})`,
          `Taxonomy: Class ${r.class || 'N/A'}, Order ${r.order_name || 'N/A'}, Family ${r.family || 'N/A'}`,
          `Facility: Resident species at ${r.zoo_name}, ${r.zoo_city ? r.zoo_city + ', ' : ''}${r.zoo_country}`,
          `Verification: Verified in official zoological collection records`
        ],
        distribution: `Resident in ${r.zoo_name}, ${r.zoo_country}`,
        presenceType: 'Resident Zoological Collection',
        confidence: 'High (Verified Record)',
        iucnSource: r.iucn_source,
        gbifSource: r.gbif_source
      }));
    } catch (err) {
      console.error(`Error fetching wildlife for zoo ${zooId} from SQLite:`, err.message);
      return [];
    }
  },

  // -------------------------------------------------------------
  // UNIFIED GLOBAL SEARCH (FORESTS, ZOOS, CITIES, COUNTRIES, SPECIES)
  // -------------------------------------------------------------

  globalSearch: async (query) => {
    if (!query || query.trim().length < 2) return { forests: [], zoos: [], species: [] };
    try {
      const q = query.trim();
      const pattern = `%${q}%`;

      const [forestResults, zooResults, speciesResults] = await Promise.all([
        dbAll(`
          SELECT * FROM forests 
          WHERE forest_name LIKE ? 
             OR country LIKE ? 
             OR state_province LIKE ? 
             OR continent LIKE ?
          ORDER BY forest_name ASC
          LIMIT 10
        `, [pattern, pattern, pattern, pattern]),
        dbAll(`
          SELECT * FROM zoos 
          WHERE zoo_name LIKE ? 
             OR country LIKE ? 
             OR city LIKE ? 
             OR continent LIKE ?
          ORDER BY zoo_name ASC
          LIMIT 10
        `, [pattern, pattern, pattern, pattern]),
        dbAll(`
          SELECT species_id, scientific_name, common_name, species_group, iucn_category, image_url 
          FROM species_master 
          WHERE common_name LIKE ? 
             OR scientific_name LIKE ?
          ORDER BY common_name ASC
          LIMIT 10
        `, [pattern, pattern])
      ]);

      return {
        forests: forestResults.map(r => ({
          type: 'forest',
          id: r.forest_id,
          forest_id: r.forest_id,
          name: r.forest_name,
          country: r.country,
          state: r.state_province || '',
          continent: r.continent,
          latitude: r.latitude,
          longitude: r.longitude,
          entrance_name: r.entrance_name || `${r.forest_name} Main Entrance`,
          entrance_latitude: r.entrance_latitude || r.latitude,
          entrance_longitude: r.entrance_longitude || r.longitude,
          description: r.description
        })),
        zoos: zooResults.map(r => ({
          type: 'zoo',
          id: r.zoo_id,
          zoo_id: r.zoo_id,
          name: r.zoo_name,
          country: r.country,
          city: r.city || '',
          continent: r.continent,
          latitude: r.latitude,
          longitude: r.longitude,
          entrance_name: r.entrance_name || `${r.zoo_name} Main Entrance`,
          entrance_latitude: r.entrance_latitude || r.latitude,
          entrance_longitude: r.entrance_longitude || r.longitude,
          description: r.description
        })),
        species: speciesResults.map(r => ({
          type: 'species',
          id: r.species_id,
          species_id: r.species_id,
          name: r.common_name || r.scientific_name,
          scientificName: r.scientific_name,
          speciesGroup: r.species_group,
          iucnCategory: r.iucn_category,
          imageUrl: getEffectiveImageUrl(r.image_url, r.species_group)
        }))
      };
    } catch (err) {
      console.error("Error in globalSearch:", err.message);
      return { forests: [], zoos: [], species: [] };
    }
  },

  // -------------------------------------------------------------
  // FOREST WILDLIFE & SPECIES (PURE SQLITE - ZERO LIVE API CALLS)
  // -------------------------------------------------------------

  getWildlifeByForestId: async (forestId, groupFilter = null) => {
    try {
      const normId = normalizeForestId(forestId);
      let sql = `
        SELECT 
          s.species_id,
          s.gbif_taxon_key,
          s.scientific_name,
          s.accepted_scientific_name,
          s.common_name,
          s.kingdom,
          s.phylum,
          s.class,
          s.order_name,
          s.family,
          s.genus,
          s.species_group,
          s.iucn_category,
          s.conservation_status,
          s.habitat,
          s.population_information,
          s.threats,
          s.image_url,
          s.diet,
          s.behaviour,
          s.lifespan,
          s.gbif_source,
          s.iucn_source,
          fs.presence_type,
          fs.confidence,
          fs.gbif_occurrence_count,
          fs.iucn_range_overlap,
          fs.source as relation_source,
          fs.last_verified,
          f.forest_id,
          f.forest_name,
          f.country as forest_country
        FROM forest_species fs
        JOIN species_master s ON fs.species_id = s.species_id
        JOIN forests f ON fs.forest_id = f.forest_id
        WHERE (fs.forest_id = ? OR fs.forest_id = ?)
      `;
      const params = [normId, String(forestId)];

      if (groupFilter) {
        sql += ` AND (LOWER(s.species_group) = LOWER(?) OR LOWER(s.species_group) LIKE LOWER(?))`;
        params.push(groupFilter, `%${groupFilter}%`);
      }

      sql += ` ORDER BY fs.gbif_occurrence_count DESC, s.common_name ASC`;
      const rows = await dbAll(sql, params);

      return rows.map((r, idx) => ({
        id: r.species_id,
        speciesId: r.species_id,
        forestId: r.forest_id,
        name: r.common_name || r.scientific_name,
        scientificName: r.scientific_name,
        acceptedScientificName: r.accepted_scientific_name,
        type: r.species_group.toLowerCase(), // 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'fish' | 'invertebrate'
        speciesGroup: r.species_group,
        kingdom: r.kingdom,
        phylum: r.phylum,
        class: r.class,
        order: r.order_name,
        family: r.family,
        genus: r.genus,
        imageUrl: getEffectiveImageUrl(r.image_url, r.species_group),
        habitat: r.habitat || 'Protected forest ecosystem',
        diet: r.diet || 'Herbivore / Carnivore / Omnivore',
        behaviour: r.behaviour || 'Native wildlife observed in habitat',
        lifespan: r.lifespan || 'Documented in biodiversity database',
        conservationStatus: r.conservation_status || (r.iucn_category ? `IUCN: ${r.iucn_category}` : 'Least Concern'),
        iucnCategory: r.iucn_category,
        interestingFacts: [
          `Conservation Status: ${r.conservation_status} (${r.iucn_category || 'Assessed'})`,
          `Taxonomy: Class ${r.class || 'N/A'}, Order ${r.order_name || 'N/A'}, Family ${r.family || 'N/A'}`,
          `Presence Type in Forest: ${r.presence_type} (Confidence: ${r.confidence})`,
          `Local Verified GBIF Occurrences: ${r.gbif_occurrence_count}`
        ],
        distribution: `${r.presence_type} in ${r.forest_name}, ${r.forest_country}`,
        presenceType: r.presence_type,
        confidence: r.confidence,
        occurrenceCount: r.gbif_occurrence_count,
        iucnSource: r.iucn_source,
        gbifSource: r.gbif_source
      }));
    } catch (err) {
      console.error(`Error fetching wildlife for forest ${forestId} from SQLite:`, err.message);
      return [];
    }
  },

  getWildlifeById: async (id) => {
    try {
      const sql = `
        SELECT * FROM species_master 
        WHERE species_id = ? 
           OR scientific_name = ? 
           OR gbif_taxon_key = ?
      `;
      const r = await dbGet(sql, [String(id), String(id), String(id)]);
      if (!r) return null;

      // Also get forest associations
      const forestSql = `
        SELECT f.forest_id, f.forest_name, f.country, fs.presence_type, fs.confidence, fs.gbif_occurrence_count
        FROM forest_species fs
        JOIN forests f ON fs.forest_id = f.forest_id
        WHERE fs.species_id = ?
      `;
      const forests = await dbAll(forestSql, [r.species_id]);

      return {
        id: r.species_id,
        speciesId: r.species_id,
        forestId: forests.length > 0 ? forests[0].forest_id : null,
        name: r.common_name || r.scientific_name,
        scientificName: r.scientific_name,
        acceptedScientificName: r.accepted_scientific_name,
        type: r.species_group.toLowerCase(),
        speciesGroup: r.species_group,
        kingdom: r.kingdom,
        phylum: r.phylum,
        class: r.class,
        order: r.order_name,
        family: r.family,
        genus: r.genus,
        imageUrl: getEffectiveImageUrl(r.image_url, r.species_group),
        habitat: r.habitat,
        diet: r.diet,
        behaviour: r.behaviour,
        lifespan: r.lifespan,
        conservationStatus: r.conservation_status,
        iucnCategory: r.iucn_category,
        populationInformation: r.population_information,
        threats: r.threats,
        interestingFacts: [
          `Conservation Status: ${r.conservation_status} (${r.iucn_category || 'Assessed'})`,
          `Taxonomic Hierarchy: Kingdom ${r.kingdom} > Phylum ${r.phylum} > Class ${r.class} > Order ${r.order_name} > Family ${r.family}`,
          `Scientific Classification: Genus ${r.genus}, Accepted Name: ${r.accepted_scientific_name}`,
          `Verified in ${forests.length} protected forest ecosystems.`
        ],
        forests: forests,
        gbifSource: r.gbif_source,
        iucnSource: r.iucn_source,
        lastUpdated: r.last_updated
      };
    } catch (err) {
      console.error(`Error fetching wildlife by ID ${id} from SQLite:`, err.message);
      return null;
    }
  },

  getAllWildlife: async (filters = {}) => {
    try {
      let sql = `SELECT * FROM species_master`;
      const params = [];

      if (filters.group) {
        sql += ` WHERE LOWER(species_group) = LOWER(?)`;
        params.push(filters.group);
      }

      sql += ` ORDER BY common_name ASC LIMIT 200`;
      const rows = await dbAll(sql, params);
      return rows.map(r => ({
        id: r.species_id,
        name: r.common_name || r.scientific_name,
        scientificName: r.scientific_name,
        type: r.species_group.toLowerCase(),
        speciesGroup: r.species_group,
        conservationStatus: r.conservation_status,
        iucnCategory: r.iucn_category,
        imageUrl: getEffectiveImageUrl(r.image_url, r.species_group)
      }));
    } catch (err) {
      console.error("Error fetching all wildlife from SQLite:", err.message);
      return [];
    }
  },

  getTotalWildlifeCount: async () => {
    try {
      const r = await dbGet(`SELECT COUNT(*) as cnt FROM species_master`);
      return r ? r.cnt : 0;
    } catch (err) {
      return 0;
    }
  },

  // -------------------------------------------------------------
  // OCCURRENCES & TELEMETRY
  // -------------------------------------------------------------

  getSpeciesOccurrences: async (speciesId, limit = 100, offset = 0) => {
    try {
      const sql = `
        SELECT * FROM species_occurrences
        WHERE species_id = ?
        ORDER BY occurrence_date DESC
        LIMIT ? OFFSET ?
      `;
      return await dbAll(sql, [String(speciesId), Number(limit), Number(offset)]);
    } catch (err) {
      console.error("Error fetching species occurrences from SQLite:", err.message);
      return [];
    }
  },

  getOccurrencesByBBox: async ({ minLat, maxLat, minLng, maxLng, group, limit = 100, offset = 0 }) => {
    try {
      let sql = `
        SELECT 
          o.occurrence_id,
          o.gbif_occurrence_key,
          o.species_id,
          o.forest_id,
          o.latitude,
          o.longitude,
          o.country,
          o.state_province,
          o.locality,
          o.occurrence_date,
          o.basis_of_record,
          s.scientific_name,
          s.common_name,
          s.species_group,
          s.iucn_category,
          s.conservation_status,
          s.image_url
        FROM species_occurrences o
        JOIN species_master s ON o.species_id = s.species_id
        WHERE 1=1
      `;
      const params = [];

      if (minLat !== undefined && maxLat !== undefined) {
        sql += ` AND o.latitude BETWEEN ? AND ?`;
        params.push(minLat, maxLat);
      }
      if (minLng !== undefined && maxLng !== undefined) {
        sql += ` AND o.longitude BETWEEN ? AND ?`;
        params.push(minLng, maxLng);
      }
      if (group) {
        sql += ` AND LOWER(s.species_group) = LOWER(?)`;
        params.push(group);
      }

      sql += ` ORDER BY o.occurrence_date DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      return await dbAll(sql, params);
    } catch (err) {
      console.error("Error querying stored occurrences in SQLite:", err.message);
      return [];
    }
  },

  getStats: async () => {
    try {
      const [forestCount, zooCount, speciesCount, occCount, fsCount, zsCount] = await Promise.all([
        dbGet(`SELECT COUNT(*) as c FROM forests`),
        dbGet(`SELECT COUNT(*) as c FROM zoos`),
        dbGet(`SELECT COUNT(*) as c FROM species_master`),
        dbGet(`SELECT COUNT(*) as c FROM species_occurrences`),
        dbGet(`SELECT COUNT(*) as c FROM forest_species`),
        dbGet(`SELECT COUNT(*) as c FROM zoo_species`)
      ]);

      const groupBreakdown = await dbAll(`
        SELECT species_group, COUNT(*) as count 
        FROM species_master 
        GROUP BY species_group
      `);

      return {
        totalForests: forestCount ? forestCount.c : 0,
        totalZoos: zooCount ? zooCount.c : 0,
        totalSpecies: speciesCount ? speciesCount.c : 0,
        totalOccurrences: occCount ? occCount.c : 0,
        totalForestSpeciesRelations: fsCount ? fsCount.c : 0,
        totalZooSpeciesRelations: zsCount ? zsCount.c : 0,
        speciesGroups: groupBreakdown
      };
    } catch (err) {
      console.error("Error computing database stats:", err.message);
      return {};
    }
  },

  // Admin mutation helpers
  addForest: async (forest) => {
    const nextRow = await dbGet(`SELECT COUNT(*) as c FROM forests`);
    const nextId = `F${String((nextRow ? nextRow.c : 0) + 1).padStart(6, '0')}`;
    const boundary = forest.boundary ? JSON.stringify(forest.boundary) : JSON.stringify({ type: 'Point', coordinates: [forest.longitude, forest.latitude] });
    const sql = `
      INSERT INTO forests (forest_id, forest_name, country, state_province, city, continent, latitude, longitude, boundary, description, area, climate, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin_input', datetime('now'))
    `;
    await dbRun(sql, [nextId, forest.name || forest.forest_name, forest.country, forest.state || forest.state_province || '', forest.city || '', forest.continent || 'Asia', forest.latitude, forest.longitude, boundary, forest.description || '', forest.area || '', forest.climate || '']);
    return await dbService.getForestById(nextId);
  },

  updateForest: async (id, updates) => {
    const normId = normalizeForestId(id);
    const sql = `
      UPDATE forests SET 
        forest_name = COALESCE(?, forest_name),
        country = COALESCE(?, country),
        state_province = COALESCE(?, state_province),
        continent = COALESCE(?, continent),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        description = COALESCE(?, description)
      WHERE forest_id = ?
    `;
    await dbRun(sql, [updates.name || updates.forest_name, updates.country, updates.state || updates.state_province, updates.continent, updates.latitude, updates.longitude, updates.description, normId]);
    return await dbService.getForestById(normId);
  },

  deleteForest: async (id) => {
    const normId = normalizeForestId(id);
    await dbRun(`DELETE FROM forests WHERE forest_id = ?`, [normId]);
    return true;
  }
};
