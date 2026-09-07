/**
 * Response Formatter and parser helper.
 */
export const responseFormatter = {
  // Clean markdown block wrappers (```json ... ```) and parse
  parseJSON(text, fallbackValue = {}) {
    if (!text) return fallbackValue;
    
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("JSON parsing failed, attempting fuzzy extract:", error.message);
      
      // Attempt fuzzy JSON regex match (objects and arrays)
      try {
        const objectMatch = cleaned.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          return JSON.parse(objectMatch[0]);
        }
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return JSON.parse(arrayMatch[0]);
        }
      } catch (nestedError) {
        console.error("Fuzzy regex extract failed:", nestedError.message);
      }
      
      return fallbackValue;
    }
  }
};
