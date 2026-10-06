/**
 * Coordinate Validation Service for WATLAS Datasets
 * 
 * Verifies that all latitude and longitude values in local SQLite datasets
 * (forests and zoos) meet strict geographic coordinate validity standards:
 * - Latitude: -90.0 to +90.0 (non-null, numeric)
 * - Longitude: -180.0 to +180.0 (non-null, numeric)
 * - Tracks missing, out-of-range, and duplicate coordinates.
 */

import { dbAll } from './dbService.js';

export async function validateDatasetCoordinates() {
  try {
    const forests = await dbAll('SELECT forest_id, forest_name, country, continent, latitude, longitude FROM forests');
    const zoos = await dbAll('SELECT zoo_id, zoo_name, country, continent, latitude, longitude FROM zoos');

    function checkRecords(records, type) {
      let valid = 0;
      let invalid = 0;
      let missing = 0;
      let outOfRange = 0;
      const invalidRecords = [];
      const coordMap = new Map();
      const duplicates = [];

      for (const r of records) {
        const id = type === 'forest' ? r.forest_id : r.zoo_id;
        const name = type === 'forest' ? r.forest_name : r.zoo_name;
        const lat = r.latitude;
        const lng = r.longitude;

        if (lat === null || lat === undefined || lng === null || lng === undefined || lat === '' || lng === '') {
          invalid++;
          missing++;
          invalidRecords.push({
            id,
            name,
            type,
            reason: 'Missing or null coordinate value',
            latitude: lat,
            longitude: lng
          });
          continue;
        }

        const numLat = Number(lat);
        const numLng = Number(lng);

        if (isNaN(numLat) || isNaN(numLng)) {
          invalid++;
          missing++;
          invalidRecords.push({
            id,
            name,
            type,
            reason: 'Non-numeric coordinate value',
            latitude: lat,
            longitude: lng
          });
          continue;
        }

        if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
          invalid++;
          outOfRange++;
          invalidRecords.push({
            id,
            name,
            type,
            reason: `Coordinate out of range [-90..90, -180..180]: lat=${numLat}, lng=${numLng}`,
            latitude: numLat,
            longitude: numLng
          });
          continue;
        }

        valid++;
        const coordKey = `${numLat.toFixed(6)},${numLng.toFixed(6)}`;
        if (coordMap.has(coordKey)) {
          coordMap.get(coordKey).push({ id, name, type, country: r.country });
        } else {
          coordMap.set(coordKey, [{ id, name, type, country: r.country }]);
        }
      }

      for (const [coords, items] of coordMap.entries()) {
        if (items.length > 1) {
          duplicates.push({
            coordinates: coords.split(',').map(Number),
            count: items.length,
            records: items
          });
        }
      }

      return {
        total: records.length,
        valid,
        invalid,
        missing,
        outOfRange,
        invalidRecords,
        duplicates
      };
    }

    const forestReport = checkRecords(forests, 'forest');
    const zooReport = checkRecords(zoos, 'zoo');

    const totalMissing = forestReport.missing + zooReport.missing;
    const totalOutOfRange = forestReport.outOfRange + zooReport.outOfRange;
    const totalDuplicates = forestReport.duplicates.length + zooReport.duplicates.length;

    const report = {
      timestamp: new Date().toISOString(),
      status: (forestReport.invalid === 0 && zooReport.invalid === 0) ? 'PASSED' : 'ISSUES_DETECTED',
      summary: {
        totalLocations: forestReport.total + zooReport.total,
        totalValid: forestReport.valid + zooReport.valid,
        totalInvalid: forestReport.invalid + zooReport.invalid,
        missingCoordinates: totalMissing,
        outOfRangeCoordinates: totalOutOfRange,
        duplicateCoordinateGroups: totalDuplicates
      },
      forests: forestReport,
      zoos: zooReport
    };

    return report;
  } catch (err) {
    console.error('[COORDINATE VALIDATION ERROR]:', err.message);
    return {
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      error: err.message,
      summary: { totalLocations: 0, totalValid: 0, totalInvalid: 0, missingCoordinates: 0, outOfRangeCoordinates: 0, duplicateCoordinateGroups: 0 },
      forests: { total: 0, valid: 0, invalid: 0, missing: 0, outOfRange: 0, invalidRecords: [], duplicates: [] },
      zoos: { total: 0, valid: 0, invalid: 0, missing: 0, outOfRange: 0, invalidRecords: [], duplicates: [] }
    };
  }
}
