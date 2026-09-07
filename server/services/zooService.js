import { authDbService } from './authDbService.js';

export const zooService = {
  getAllZoos: async () => {
    return await authDbService.getZoos();
  },

  addZoo: async (zooData) => {
    if (!zooData.name || !zooData.country || !zooData.latitude || !zooData.longitude || !zooData.notable_species) {
      throw new Error("Missing required fields for zoo creation.");
    }
    return await authDbService.addZoo(zooData);
  },

  deleteZoo: async (id) => {
    return await authDbService.deleteZoo(id);
  }
};
