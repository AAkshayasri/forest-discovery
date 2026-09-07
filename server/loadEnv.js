import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const isPlaceholder = (val) => !val || val.includes('your_') || val.trim() === '';

if (!apiKey || isPlaceholder(apiKey)) {
  console.error("ERROR: GEMINI_API_KEY is missing.\nProduction server cannot start.");
  process.exit(1);
}
