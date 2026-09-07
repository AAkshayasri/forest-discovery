/**
 * Server-side Wildlife Data Integrity Validator
 */
export const dataValidator = {
  validateWildlifeList: (wildlifeList) => {
    console.log("=== STARTING WILDLIFE DATA INTEGRITY CHECK ===");
    
    if (!Array.isArray(wildlifeList)) {
      console.warn("[VALIDATION WARNING] Wildlife list is not an array. Skipping validation.");
      return [];
    }

    const validRecords = [];
    const seenIds = new Set();
    const seenScientificNames = new Set();

    const requiredFields = [
      'id',
      'name',
      'scientificName',
      'type',
      'habitat',
      'diet',
      'behaviour',
      'lifespan',
      'conservationStatus',
      'interestingFacts',
      'distribution'
    ];

    for (const record of wildlifeList) {
      const nameForLogs = record.name || `ID ${record.id}`;

      // 1. Check Unique ID
      if (record.id === undefined || record.id === null) {
        console.warn(`[VALIDATION WARNING] Record "${nameForLogs}" is missing a unique ID. Skipping record.`);
        continue;
      }
      if (seenIds.has(record.id)) {
        console.warn(`[VALIDATION WARNING] Duplicate ID detected: ${record.id} for "${nameForLogs}". Skipping record.`);
        continue;
      }

      // 2. Check Scientific Name
      if (!record.scientificName || record.scientificName.trim() === '') {
        console.warn(`[VALIDATION WARNING] Record "${nameForLogs}" is missing a scientific name. Skipping record.`);
        continue;
      }
      const normScientific = record.scientificName.toLowerCase().trim();
      if (seenScientificNames.has(normScientific)) {
        console.warn(`[VALIDATION WARNING] Duplicate Scientific Name detected: "${record.scientificName}" for "${nameForLogs}". Skipping record.`);
        continue;
      }

      // 3. Check Required Fields & Missing Values
      let hasMissingField = false;
      for (const field of requiredFields) {
        if (record[field] === undefined || record[field] === null || (typeof record[field] === 'string' && record[field].trim() === '')) {
          console.warn(`[VALIDATION WARNING] Record "${nameForLogs}" (ID ${record.id}) is missing required field: "${field}".`);
          hasMissingField = true;
        }
      }

      if (hasMissingField) {
        console.warn(`[VALIDATION WARNING] Record "${nameForLogs}" (ID ${record.id}) has missing values. Skipping record for integrity.`);
        continue;
      }

      // Mark as seen and add to valid list
      seenIds.add(record.id);
      seenScientificNames.add(normScientific);
      validRecords.push(record);
    }

    console.log(`=== WILDLIFE DATA INTEGRITY CHECK COMPLETE. Loaded ${validRecords.length} of ${wildlifeList.length} records. ===`);
    return validRecords;
  }
};
