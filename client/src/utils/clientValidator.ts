/**
 * Client-side Wildlife Data Validation Helper
 */
export const validateAndFormatField = (value: any, animalName?: string, fieldName?: string): string => {
  if (value === undefined || value === null) {
    return "Information unavailable";
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'information not available' || trimmed.toLowerCase() === 'information unavailable') {
      return "Information unavailable";
    }
    
    // Cross-validate that attributes do not leak generic felid properties for other species
    if (animalName && fieldName) {
      const lowerName = animalName.toLowerCase();
      const isFelidProperty = ['panthera', 'felidae', 'carnivora', 'stalk and ambush'].some(term => trimmed.toLowerCase().includes(term));
      
      // If a species is clearly an insect, reptile, or elephant but contains big cat taxonomies, mark it unavailable
      if (isFelidProperty && !lowerName.includes('tiger') && !lowerName.includes('lion') && !lowerName.includes('jaguar') && !lowerName.includes('leopard')) {
        const taxonomicFields = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'diet'];
        if (taxonomicFields.includes(fieldName)) {
          return "Information unavailable";
        }
      }
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "Information unavailable";
    }
    // Filter out invalid/empty/placeholder elements
    const validElements = value.filter(item => {
      if (typeof item === 'string') {
        const itemLower = item.toLowerCase().trim();
        return itemLower !== '' && itemLower !== 'information not available' && itemLower !== 'information unavailable';
      }
      return item !== undefined && item !== null;
    });

    if (validElements.length === 0) {
      return "Information unavailable";
    }
  }

  return value;
};
