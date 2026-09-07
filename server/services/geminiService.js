import '../loadEnv.js';
import { GoogleGenAI } from '@google/genai';
import { promptBuilder } from './promptBuilder.js';
import { responseFormatter } from './responseFormatter.js';
import { visionService } from './visionService.js';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

// Startup validation test
ai.models.generateContent({
  model: 'gemini-3.5-flash-lite',
  contents: 'ping',
}).then(() => {
  console.log("✓ Gemini Connected");
}).catch((error) => {
  console.error("ERROR: Failed to connect to Gemini API on startup:", error.message);
});

export const geminiService = {
  getMode: () => "production",

  // 1. AI Wildlife Species Identifier (Gemini Vision)
  identifySpecies: async (imageBase64, mimeType) => {
    try {
      return await visionService.identifySpecies(ai, imageBase64, mimeType);
    } catch (err) {
      console.error("Gemini Live Vision Identification failed:", err);
      throw err;
    }
  },

  // 2. AI Wildlife Chat Assistant
  generateChatResponse: async (prompt, contextMessages = [], style = 'beginner') => {
    try {
      const fullPrompt = promptBuilder.buildChatPrompt(prompt, contextMessages, style);
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: fullPrompt,
      });

      if (response && response.text) {
        return {
          answer: response.text.trim()
        };
      }
      throw new Error("Empty response received from Gemini API");
    } catch (err) {
      console.error("Gemini Live Chat failed:", err);
      throw err;
    }
  },

  // 2b. AI Wildlife Chat Stream (SSE)
  generateChatStream: async function* (prompt, contextMessages = [], style = 'beginner') {
    try {
      const fullPrompt = promptBuilder.buildChatPrompt(prompt, contextMessages, style);
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.5-flash-lite',
        contents: fullPrompt,
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (err) {
      console.error("Gemini Streaming Chat failed:", err);
      throw err;
    }
  },

  // 3. AI Forest Explorer Overview
  generateForestOverview: async (forestName, description) => {
    try {
      const prompt = promptBuilder.buildForestOverviewPrompt(forestName, description);
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt
      });

      if (response && response.text) {
        return responseFormatter.parseJSON(response.text);
      }
      throw new Error("Empty response received from Gemini API");
    } catch (err) {
      console.error("Gemini Forest Overview failed:", err);
      throw err;
    }
  },

  // 4. AI Species Summary
  generateSpeciesSummary: async (speciesName) => {
    try {
      const prompt = promptBuilder.buildSpeciesSummaryPrompt(speciesName);
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt
      });

      if (response && response.text) {
        return responseFormatter.parseJSON(response.text);
      }
      throw new Error("Empty response received from Gemini API");
    } catch (err) {
      console.error("Gemini Species Summary failed:", err);
      throw err;
    }
  },

  // 5. AI Search Intent Assistant
  understandSearchIntent: async (query) => {
    try {
      const prompt = promptBuilder.buildSearchIntentPrompt(query);
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt
      });

      if (response && response.text) {
        return responseFormatter.parseJSON(response.text);
      }
      throw new Error("Empty response received from Gemini API");
    } catch (err) {
      console.error("Gemini Search Intent failed:", err);
      throw err;
    }
  },

  generateForestsList: async () => {
    try {
      const prompt = `Generate a JSON array of 120 famous, diverse national parks, wildlife sanctuaries, state forests, and nature reserves globally. 
For each location, output a JSON object with:
- id (sequential integer starting from 1)
- name (full official name)
- country
- state (or province/region)
- latitude (accurate floating point number)
- longitude (accurate floating point number)
- area (e.g. "1,200 km²")
- climate (e.g. "Temperate Deciduous")
- description (1-2 sentences overview of its ecosystem and landscape)

Ensure coordinates are accurate. Output strictly valid JSON matching the schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "INTEGER" },
                name: { type: "STRING" },
                country: { type: "STRING" },
                state: { type: "STRING" },
                latitude: { type: "NUMBER" },
                longitude: { type: "NUMBER" },
                area: { type: "STRING" },
                climate: { type: "STRING" },
                description: { type: "STRING" }
              },
              required: ["id", "name", "country", "state", "latitude", "longitude", "area", "climate", "description"]
            }
          }
        }
      });

      if (response && response.text) {
        return JSON.parse(response.text.trim());
      }
      throw new Error("Empty response received from Gemini API");
    } catch (e) {
      console.error("Failed to generate dynamic forests list from Gemini:", e);
      throw e;
    }
  },

  generateWildlifeForForest: async (forestName, forestId) => {
    try {
      const prompt = `Generate a JSON array of 8 diverse wildlife species native to "${forestName}".
Include exactly:
- 3 mammals (type: "animal")
- 3 birds (type: "bird")
- 2 reptiles (type: "reptile")

For each species, output a JSON object with:
- id (sequential integer starting from ${forestId * 100})
- forestId (set to exactly ${forestId})
- name (common name, e.g. "Bengal Tiger")
- scientificName (e.g. "Panthera tigris")
- type ("animal" | "bird" | "reptile")
- habitat
- diet (strictly specify dietary preferences)
- behaviour (sentence overview of its activity and social structure)
- lifespan (e.g. "10-15 years")
- conservationStatus (e.g. "Endangered", "Vulnerable", "Near Threatened", or "Least Concern")
- interestingFacts (array of 2 strings)
- distribution (geographical distribution range)

Ensure the species name matches the classification and type exactly. Output strictly valid JSON matching the schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "INTEGER" },
                forestId: { type: "INTEGER" },
                name: { type: "STRING" },
                scientificName: { type: "STRING" },
                type: { type: "STRING" },
                habitat: { type: "STRING" },
                diet: { type: "STRING" },
                behaviour: { type: "STRING" },
                lifespan: { type: "STRING" },
                conservationStatus: { type: "STRING" },
                interestingFacts: {
                  type: "ARRAY",
                  items: { type: "STRING" }
                },
                distribution: { type: "STRING" }
              },
              required: ["id", "forestId", "name", "scientificName", "type", "habitat", "diet", "behaviour", "lifespan", "conservationStatus", "interestingFacts", "distribution"]
            }
          }
        }
      });

      if (response && response.text) {
        const rawList = JSON.parse(response.text.trim());
        const { imageProvider } = await import('./imageProvider.js');
        return rawList.map(item => ({
          ...item,
          imageUrl: imageProvider.getImageForSpecies(item.name, item.type)
        }));
      }
      throw new Error("Empty response received from Gemini API");
    } catch (e) {
      console.error(`Failed to generate dynamic wildlife for ${forestName} from Gemini:`, e);
      throw e;
    }
  },

  generateDetailedSpeciesProfile: async (speciesName) => {
    try {
      const prompt = promptBuilder.buildDetailedSpeciesProfilePrompt(speciesName);
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt
      });

      if (response && response.text) {
        return responseFormatter.parseJSON(response.text);
      }
      throw new Error("Empty response received from Gemini API");
    } catch (err) {
      console.error("Gemini Detailed Species Profile failed:", err);
      throw err;
    }
  }
};
