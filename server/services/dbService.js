import '../loadEnv.js';
import { createClient } from '@supabase/supabase-js';
import { mockWildlife } from '../database/mockData.js';
import { geminiService } from './geminiService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the 120 static global forests generated from Gemini
const staticForests = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../database/forests_static.json'), 'utf8')
);

// Memory cache storage initialized with static mock data to keep pin points constant
let dynamicForests = JSON.parse(JSON.stringify(staticForests));
let dynamicWildlife = JSON.parse(JSON.stringify(mockWildlife));

const wildlifeCache = new Map();
const wildlifeCacheTimestamp = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 Hours TTL Cache

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isDemoMode = true;

const isPlaceholder = (val) => !val || val.includes('your_') || val.trim() === '';

if (supabaseUrl && !isPlaceholder(supabaseUrl) && supabaseAnonKey && !isPlaceholder(supabaseAnonKey)) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isDemoMode = false;
    console.log("Supabase Client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Supabase client, falling back to Demo Mode:", error.message);
  }
} else {
  console.log("Supabase credentials missing or placeholders. Running in Demo Mode (Mock Database).");
}

export const dbService = {
  getMode: () => (isDemoMode ? "demo" : "production"),

  getForests: async () => {
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase.from('forests').select('*');
      if (!error && data && data.length > 0) return data;
      console.error("Supabase error, falling back to mock:", error);
    }
    return dynamicForests;
  },

  getForestById: async (id) => {
    const numId = Number(id);
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase.from('forests').select('*').eq('id', numId).single();
      if (!error && data) return data;
      console.error("Supabase error, falling back to mock:", error);
    }
    return dynamicForests.find(f => f.id === numId || String(f.id) === String(id));
  },

  searchForests: async (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase().trim();

    if (!isDemoMode && supabase) {
      const { data, error } = await supabase
        .from('forests')
        .select('*')
        .or(`name.ilike.%${lowerQuery}%,state.ilike.%${lowerQuery}%,country.ilike.%${lowerQuery}%`);
      if (!error && data) return data;
      console.error("Supabase search error, falling back to mock:", error);
    }

    return dynamicForests.filter(forest => 
      (forest.name && forest.name.toLowerCase().includes(lowerQuery)) ||
      (forest.state && forest.state.toLowerCase().includes(lowerQuery)) ||
      (forest.country && forest.country.toLowerCase().includes(lowerQuery))
    );
  },

  getWildlifeByForestId: async (forestId) => {
    const numForestId = Number(forestId);
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase.from('animals').select('*').eq('forest_id', numForestId);
      if (!error && data && data.length > 0) return data;
      console.error("Supabase error:", error);
    }

    // Check if we have static wildlife in dynamicWildlife
    const staticList = dynamicWildlife.filter(w => w.forestId === numForestId || String(w.forestId) === String(forestId));
    if (staticList.length > 0) {
      return staticList;
    }

    // If not, fetch/generate wildlife dynamically via Gemini so there is always wildlife
    const now = Date.now();
    const cached = wildlifeCache.get(numForestId);
    const cachedTime = wildlifeCacheTimestamp.get(numForestId) || 0;

    if (cached && (now - cachedTime < CACHE_TTL)) {
      return cached;
    }

    const forest = await dbService.getForestById(numForestId);
    if (!forest) return [];

    console.log(`Generating dynamic wildlife for ${forest.name} using Gemini API...`);
    try {
      const generatedWildlife = await geminiService.generateWildlifeForForest(forest.name, numForestId);
      if (generatedWildlife && generatedWildlife.length > 0) {
        // Add to dynamicWildlife so it behaves statically once generated during this run
        dynamicWildlife.push(...generatedWildlife);
        wildlifeCache.set(numForestId, generatedWildlife);
        wildlifeCacheTimestamp.set(numForestId, now);
        return generatedWildlife;
      }
    } catch (aiErr) {
      console.error("Failed to generate dynamic wildlife via Gemini:", aiErr.message);
    }

    // Fallback: return sample wildlife mapped to this forest ID if available
    const fallbackList = dynamicWildlife.slice(0, 6).map(item => ({
      ...item,
      forestId: numForestId
    }));
    return fallbackList;
  },

  getWildlifeById: async (id) => {
    const numId = Number(id);
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase.from('animals').select('*').eq('id', numId).single();
      if (!error && data) return data;
      console.error("Supabase error:", error);
    }
    
    // Check in-memory wildlife cache / dynamicWildlife
    const found = dynamicWildlife.find(w => w.id === numId || String(w.id) === String(id));
    if (found) return found;

    throw new Error("Wildlife record not found.");
  },

  getAllWildlife: async () => {
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase.from('animals').select('*');
      if (!error && data) return data;
    }
    return dynamicWildlife;
  },

  getTotalWildlifeCount: async () => {
    if (!isDemoMode && supabase) {
      const { count, error } = await supabase.from('animals').select('*', { count: 'exact', head: true });
      if (!error) return count || dynamicWildlife.length;
    }
    return dynamicWildlife.length;
  },

  addForest: async (forest) => {
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase.from('forests').insert([forest]).select();
      if (!error) return data[0];
      throw error;
    }
    
    // In-memory addition
    const newId = dynamicForests.length > 0 ? Math.max(...dynamicForests.map(f => f.id)) + 1 : 1;
    const newForest = {
      id: newId,
      ...forest,
      latitude: Number(forest.latitude),
      longitude: Number(forest.longitude),
      // Generate a mock polygon coordinate set for Leaflet highlights
      boundary: forest.boundary || {
        type: "Feature",
        properties: { name: forest.name },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [Number(forest.longitude) - 0.15, Number(forest.latitude) - 0.15],
            [Number(forest.longitude) + 0.15, Number(forest.latitude) - 0.15],
            [Number(forest.longitude) + 0.15, Number(forest.latitude) + 0.15],
            [Number(forest.longitude) - 0.15, Number(forest.latitude) + 0.15],
            [Number(forest.longitude) - 0.15, Number(forest.latitude) - 0.15]
          ]]
        }
      }
    };
    dynamicForests.push(newForest);
    return newForest;
  },

  deleteForest: async (id) => {
    const numId = Number(id);
    if (!isDemoMode && supabase) {
      const { error } = await supabase.from('forests').delete().eq('id', numId);
      if (!error) return true;
      throw error;
    }

    dynamicForests = dynamicForests.filter(f => f.id !== numId);
    dynamicWildlife = dynamicWildlife.filter(w => w.forestId !== numId);
    return true;
  },

  updateForest: async (id, updates) => {
    const numId = Number(id);
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase.from('forests').update(updates).eq('id', numId).select();
      if (!error) return data[0];
      throw error;
    }

    const index = dynamicForests.findIndex(f => f.id === numId);
    if (index === -1) throw new Error("Forest not found.");
    dynamicForests[index] = {
      ...dynamicForests[index],
      ...updates,
      latitude: updates.latitude !== undefined ? Number(updates.latitude) : dynamicForests[index].latitude,
      longitude: updates.longitude !== undefined ? Number(updates.longitude) : dynamicForests[index].longitude,
    };
    return dynamicForests[index];
  },

  addWildlife: async (animal) => {
    if (!isDemoMode && supabase) {
      // Map keys to DB column names (camelCase to snake_case if applicable)
      const dbAnimal = {
        forest_id: Number(animal.forestId),
        name: animal.name,
        scientific_name: animal.scientificName,
        type: animal.type,
        image_url: animal.imageUrl,
        habitat: animal.habitat,
        diet: animal.diet,
        behaviour: animal.behaviour,
        lifespan: animal.lifespan,
        conservation_status: animal.conservationStatus,
        interesting_facts: animal.interestingFacts,
        distribution: animal.distribution
      };
      const { data, error } = await supabase.from('animals').insert([dbAnimal]).select();
      if (!error) return data[0];
      throw error;
    }

    const newId = dynamicWildlife.length > 0 ? Math.max(...dynamicWildlife.map(w => w.id)) + 1 : 101;
    const newAnimal = {
      id: newId,
      ...animal,
      forestId: Number(animal.forestId)
    };
    dynamicWildlife.push(newAnimal);
    return newAnimal;
  },

  deleteWildlife: async (id) => {
    const numId = Number(id);
    if (!isDemoMode && supabase) {
      const { error } = await supabase.from('animals').delete().eq('id', numId);
      if (!error) return true;
      throw error;
    }

    dynamicWildlife = dynamicWildlife.filter(w => w.id !== numId);
    return true;
  },

  updateWildlife: async (id, updates) => {
    const numId = Number(id);
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase.from('animals').update(updates).eq('id', numId).select();
      if (!error) return data[0];
      throw error;
    }

    const index = dynamicWildlife.findIndex(w => w.id === numId);
    if (index === -1) throw new Error("Wildlife record not found.");
    dynamicWildlife[index] = {
      ...dynamicWildlife[index],
      ...updates,
      forestId: updates.forestId !== undefined ? Number(updates.forestId) : dynamicWildlife[index].forestId,
    };
    return dynamicWildlife[index];
  }
};

