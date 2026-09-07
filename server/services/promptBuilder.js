/**
 * Modular Prompt Templates for live Gemini requests.
 */
export const promptBuilder = {
  buildSpeciesSummaryPrompt(speciesName) {
    return `Generate a comprehensive biological and ecological summary for the species: "${speciesName}".
You MUST respond with a JSON object containing a single key "markdown". The value of "markdown" must be a string containing exactly these five sections in this exact order, formatted with standard markdown headings and clean bullet points:

### Overview
* Point 1
* Point 2

### Habitat
* Point 1
* Point 2

### Key Characteristics
* Point 1
* Point 2

### Conservation Status
* Point 1
* Point 2

### Interesting Facts
* Point 1
* Point 2

Ensure the content is detailed, highly accurate, and contains only these five sections. No extra text or headings outside the requested structure.`;
  },

  buildForestOverviewPrompt(forestName, description) {
    return `Create an expert ecological overview for the following forest/national park:
Name: "${forestName}"
Given description: "${description}"

Return a strictly formatted JSON object with the following fields:
{
  "forestDescription": "Comprehensive introduction, landscape description, and geological context",
  "climate": "Annual temperatures, rainfall seasons, moisture index",
  "ecosystem": "Ecosystem type, biomes represented, elevations",
  "flora": "Dominant canopy trees, undergrowth plants, key endemic vegetation",
  "fauna": "Major mammal, bird, reptile, and insect categories present",
  "endangeredSpecies": "List of key endangered or threatened species found here",
  "bestVisitingSeason": "Month range, optimal weather condition, animal sighting windows",
  "conservationEfforts": "Anti-poaching squads, reforestation projects, local community incentives",
  "interestingFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "biodiversityImportance": "Ecological value on a national or global scale"
}
Ensure the content is engaging, rich in detail, and fits perfectly in the requested JSON structure. No other text around the JSON.`;
  },

  buildChatPrompt(prompt, contextMessages = [], style = 'beginner') {
    const styleDescriptions = {
      'student': 'Explain in clear terms suitable for high school or college students, focusing on concepts and key facts.',
      'beginner': 'Use easy-to-understand language, avoiding heavy jargon, and explain concepts from scratch.',
      'scientific': 'Provide precise, highly technical, and taxonomy-focused biological explanations.',
      'research': 'Frame the response as a deep academic overview with focus on ecological studies, methodology, or conservation biology.',
      'child friendly': 'Use highly engaging, simple, and exciting words suitable for young children, using animal sounds/emojis.',
      'short summary': 'Be extremely concise. Summarize the answer in 2-3 sentences max.',
      'detailed explanation': 'Deliver an exhaustive, structured, and long-form overview covering all biological angles.'
    };

    const styleInstruction = styleDescriptions[style.toLowerCase()] || styleDescriptions['beginner'];

    let formattedContext = '';
    if (contextMessages.length > 0) {
      formattedContext = 'Conversation History:\n' + contextMessages.map(m => `User: ${m.prompt}\nAssistant: ${m.answer}`).join('\n') + '\n\n';
    }

    return `You are Atlas AI Guide, the resident expert biologist and wildlife conservationist at Wildlife Explorer.
Your goal is to answer the user's wildlife and ecology questions accurately, engagingly, and informatively.

Tone / Mode Style: ${styleInstruction}

${formattedContext}Current User Question: "${prompt}"

Provide a clean, direct, and helpful response in standard Markdown.`;
  },

  buildSearchIntentPrompt(query) {
    return `The user is searching for wildlife or species in a database, but their query didn't return direct results.
Query: "${query}"

Analyze the intent of this query (e.g. descriptions, common traits, locations like "Big cat in India" or "striped animal in Africa").
Return a strictly formatted JSON object containing suggested species that exist in typical wildlife databases:
{
  "suggestions": [
    "Species Name 1",
    "Species Name 2",
    "Species Name 3"
  ]
}
Return maximum 4 highly relevant species names. Valid JSON only.`;
  },

  buildDetailedSpeciesProfilePrompt(speciesName) {
    return `Generate a comprehensive biological profile for the species "${speciesName}".
Return a strictly formatted JSON object with the following fields:
{
  "kingdom": "Scientific Kingdom",
  "phylum": "Scientific Phylum",
  "class": "Scientific Class",
  "order": "Scientific Order",
  "family": "Scientific Family",
  "genus": "Scientific Genus",
  "species": "Scientific Species",
  "description": "General description of the species (2-3 sentences)",
  "habitat": "Type of habitat it occupies",
  "distribution": "Geographical distribution range",
  "countries": "Countries where it is found",
  "diet": "Diet details (herbivore/carnivore/omnivore and main prey/plants)",
  "lifespan": "Average lifespan in the wild and captivity",
  "averageHeight": "Average height/length in metric units",
  "averageWeight": "Average weight in metric units",
  "speed": "Top speed in km/h",
  "behaviour": "Social structures, activity patterns (diurnal/nocturnal), temperament",
  "reproduction": "Gestation period, litter size, mating season details",
  "populationTrend": "Increasing/Decreasing/Stable and estimated wild population",
  "majorThreats": "Primary threats (e.g. poaching, habitat fragmentation)",
  "conservationEfforts": "Key actions being taken to protect it",
  "funFacts": ["Fact 1", "Fact 2", "Fact 3"]
}
Ensure the values are highly accurate and the output is valid JSON only. No other text around the JSON.`;
  }
};
