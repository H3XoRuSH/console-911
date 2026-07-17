/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const SCENARIOS_DIR = path.join(__dirname, '..', 'data', 'scenarios');

function cleanSentence(sentence) {
  let cleaned = sentence;
  const lower = cleaned.toLowerCase();

  // 1. Handle common introductions & compound clauses containing name + address
  if (lower.includes('my name is') && lower.includes("{address_location}")) {
    cleaned = cleaned.replace(/and\s+i'm\s+at\s+\{address_location\}/i, '');
    cleaned = cleaned.replace(/,\s*address\s+\{address_location\}/i, '');
    cleaned = cleaned.replace(/at\s+\{address_location\}/i, '');
  }
  
  if (lower.includes('this is') && lower.includes('{address_location}')) {
    cleaned = cleaned.replace(/from\s+\{address_location\}/i, '');
    cleaned = cleaned.replace(/at\s+\{address_location\}/i, '');
  }

  // 2. Handle active clause transitions (e.g. "I'm at {address_location} and my house is...")
  cleaned = cleaned.replace(/I'm\s+at\s+\{address_location\}\s+and\s+I'm\s+/gi, "I'm ");
  cleaned = cleaned.replace(/I'm\s+at\s+\{address_location\}\s+and\s+/gi, "");
  cleaned = cleaned.replace(/I\s+am\s+at\s+\{address_location\}\s+and\s+/gi, "");
  cleaned = cleaned.replace(/We're\s+at\s+\{address_location\}\s+and\s+/gi, "We're ");

  // 3. Discard standalone location sentences entirely
  const stripped = cleaned.replace(/[\s.!?,'"]/g, '').toLowerCase();
  const discardPatterns = [
    'imat{address_location}',
    'iamat{address_location}',
    'theaddressis{address_location}',
    'myaddressis{address_location}',
    'addressis{address_location}',
    'imhiddenat{address_location}',
    'werelockedat{address_location}',
    'imoutside{address_location}',
    'myplaceis{address_location}',
    'myhomeis{address_location}',
    'hereat{address_location}'
  ];
  
  if (discardPatterns.some(pat => stripped === pat)) {
    return '';
  }

  // 4. Strip specific inline prepositions
  cleaned = cleaned.replace(/\s+at\s+\{address_location\}/gi, '');
  cleaned = cleaned.replace(/\s+from\s+\{address_location\}/gi, '');
  cleaned = cleaned.replace(/\s+to\s+\{address_location\}/gi, '');
  cleaned = cleaned.replace(/\s+on\s+\{address_location\}/gi, '');
  cleaned = cleaned.replace(/\s+in\s+\{address_location\}/gi, '');
  cleaned = cleaned.replace(/\{address_location\}/gi, '');

  // 5. Clean punctuation and spaces
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/\s+([.!?])/g, '$1').trim();
  
  // Capitalize first letter if it got lowercased by replacements
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

function cleanVariation(variation) {
  if (!variation) return '';
  
  // Split into sentences using lookbehind for punctuation
  const sentences = variation.split(/(?<=[.!?])\s+/);
  const cleaned = sentences
    .map(s => cleanSentence(s))
    .filter(s => s.trim().length > 0)
    .join(' ');
    
  return cleaned;
}

fs.readdirSync(SCENARIOS_DIR).forEach(file => {
  if (file.endsWith('.json')) {
    const filePath = path.join(SCENARIOS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    let changedCount = 0;
    
    data.forEach(scenario => {
      if (scenario.initial_variations) {
        scenario.initial_variations = scenario.initial_variations.map(variation => {
          const cleaned = cleanVariation(variation);
          if (cleaned !== variation) {
            changedCount++;
          }
          return cleaned;
        });
      }
    });
    
    if (changedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Cleaned ${changedCount} variations in ${file}`);
    }
  }
});
console.log('Cleanup completed successfully!');
