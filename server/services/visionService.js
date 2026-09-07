import { responseFormatter } from './responseFormatter.js';

export const visionService = {
  async identifySpecies(ai, imageBase64, mimeType) {
    if (!ai) {
      throw new Error("Gemini AI instance is not initialized.");
    }

    const promptText = `Identify the species of animal, bird, or reptile in the provided image.
Provide the response in the schema requested. If the image is not an animal, bird, or reptile, identify it with name "Unknown Species", confidenceScore 0.0, type "animal", and placeholder text for other fields.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType
          }
        },
        promptText
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            scientificName: { type: "STRING" },
            type: { type: "STRING", enum: ["animal", "bird", "reptile"] },
            imageUrl: { type: "STRING" },
            habitat: { type: "STRING" },
            diet: { type: "STRING" },
            behaviour: { type: "STRING" },
            lifespan: { type: "STRING" },
            conservationStatus: { type: "STRING" },
            interestingFacts: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            distribution: { type: "STRING" },
            confidenceScore: { type: "NUMBER" },
            ecologicalRole: { type: "STRING" },
            similarSpecies: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            safetyInfo: { type: "STRING" }
          },
          required: [
            "name", "scientificName", "type", "habitat", "diet", 
            "behaviour", "lifespan", "conservationStatus", 
            "interestingFacts", "distribution", "confidenceScore",
            "ecologicalRole", "similarSpecies", "safetyInfo"
          ]
        }
      }
    });

    if (response && response.text) {
      return responseFormatter.parseJSON(response.text);
    }
    
    throw new Error("Empty response from live Gemini Vision API.");
  }
};
