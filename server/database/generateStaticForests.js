import '../loadEnv.js';
import { geminiService } from '../services/geminiService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("Generating static 120 forests from Gemini...");
  try {
    const generatedList = await geminiService.generateForestsList();
    if (generatedList && generatedList.length > 0) {
      const forestsWithBoundaries = generatedList.map(forest => ({
        ...forest,
        boundary: {
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
      }));
      
      const filePath = path.join(__dirname, 'forests_static.json');
      fs.writeFileSync(filePath, JSON.stringify(forestsWithBoundaries, null, 2), 'utf-8');
      console.log(`Successfully generated and wrote 120 static forests to ${filePath}`);
    } else {
      console.error("Empty list generated");
    }
  } catch (err) {
    console.error("Failed to generate static forests:", err);
  }
}

run();
