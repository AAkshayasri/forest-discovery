/**
 * WildAtlas - GBIF Runtime & Ingestion Service
 * 
 * RUNTIME ARCHITECTURE REQUIREMENT:
 * Normal user interactions query ONLY the local SQLite database (watlas.db).
 * External GBIF requests are ONLY made by the ingestion/refresh CLI process.
 */

import { dbService } from './dbService.js';

export const gbifService = {
  /**
   * Query stored occurrences from local SQLite watlas.db with filtering.
   * NEVER calls GBIF API during normal usage.
   */
  getStoredOccurrences: async (params = {}) => {
    return await dbService.getOccurrencesByBBox(params);
  },

  /**
   * Retrieve occurrence telemetry stats from local SQLite.
   */
  getStats: async () => {
    const stats = await dbService.getStats();
    return {
      total: stats.totalOccurrences || 0,
      uniqueSpecies: stats.totalSpecies || 0,
      breakdown: stats.speciesGroups || []
    };
  },

  /**
   * Retrieve a single occurrence record from local SQLite.
   */
  getOccurrenceById: async (id) => {
    const occs = await dbService.getSpeciesOccurrences(id, 1, 0);
    return occs && occs.length > 0 ? occs[0] : null;
  }
};
