import xlsxPkg from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const { readFile, utils } = xlsxPkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const workbook = readFile(path.join(ROOT_DIR, 'data/zoos_by_continent.xlsx'));
console.log("Sheet names:", workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json(sheet);
  console.log(`Sheet: ${sheetName} (${data.length} rows)`);
  if (data.length > 0) {
    console.log("Sample row:", data[0]);
  }
}
