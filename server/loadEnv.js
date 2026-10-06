import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
const isPlaceholder = (val) => !val || val.includes('your_') || val.trim() === '';

if (!apiKey || isPlaceholder(apiKey)) {
  console.error("ERROR: GEMINI_API_KEY is missing.\nProduction server cannot start.");
  process.exit(1);
}
