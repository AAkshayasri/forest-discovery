import xlsxPkg from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const { readFile, utils } = xlsxPkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const workbook = readFile(path.join(ROOT_DIR, 'data/zoos_by_continent.xlsx'));
const sheet = workbook.Sheets['Zoos by Continent'];
const data = utils.sheet_to_json(sheet);
console.log(`Total zoos: ${data.length}`);
console.table(data.slice(0, 15));
