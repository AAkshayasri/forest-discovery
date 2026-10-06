import fs from 'fs';
import XLSX from 'xlsx';

const forestCsvPath = 'C:/Users/aksha/Downloads/global_forests.csv';
const zooXlsxPath = 'C:/Users/aksha/Downloads/zoos_by_continent.xlsx';

console.log('=== INSPECTING FOREST CSV ===');
if (fs.existsSync(forestCsvPath)) {
  const forestWb = XLSX.readFile(forestCsvPath);
  const sheetName = forestWb.SheetNames[0];
  const forestData = XLSX.utils.sheet_to_json(forestWb.Sheets[sheetName], { defval: '' });
  console.log(`Sheet name: ${sheetName}`);
  console.log(`Total rows: ${forestData.length}`);
  if (forestData.length > 0) {
    console.log('Columns:', Object.keys(forestData[0]));
    console.log('Sample 3 rows:', JSON.stringify(forestData.slice(0, 3), null, 2));
  }
} else {
  console.log('Forest CSV not found at:', forestCsvPath);
}

console.log('\n=== INSPECTING ZOO XLSX ===');
if (fs.existsSync(zooXlsxPath)) {
  const zooWb = XLSX.readFile(zooXlsxPath);
  console.log('Sheets in Zoo XLSX:', zooWb.SheetNames);
  for (const sName of zooWb.SheetNames) {
    const sheetData = XLSX.utils.sheet_to_json(zooWb.Sheets[sName], { defval: '' });
    console.log(`\nSheet: "${sName}" - Rows: ${sheetData.length}`);
    if (sheetData.length > 0) {
      console.log('Columns:', Object.keys(sheetData[0]));
      console.log('Sample 2 rows:', JSON.stringify(sheetData.slice(0, 2), null, 2));
    }
  }
} else {
  console.log('Zoo XLSX not found at:', zooXlsxPath);
}
