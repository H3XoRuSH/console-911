/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const SCENARIOS_DIR = path.join(__dirname, '..', 'data', 'scenarios');

function fixGrammar(text) {
  if (!text) return '';
  let cleaned = text;

  // Clean trailing commas and dots
  cleaned = cleaned.replace(/,\s*\./g, '.');
  cleaned = cleaned.replace(/,\s*!/g, '!');
  cleaned = cleaned.replace(/,\s*\?/g, '?');
  
  // Fix dangling "for" (e.g. "order a pizza for. Uh..." -> "order a pizza for delivery. Uh...")
  cleaned = cleaned.replace(/\bfor\b\s*\./gi, 'for delivery.');
  cleaned = cleaned.replace(/\bfor\b\s*!/gi, 'for delivery!');
  cleaned = cleaned.replace(/\bfor\b\s*\?/gi, 'for delivery?');

  // Fix dangling "to" (e.g. "Delivery please, to." -> "Delivery please.")
  cleaned = cleaned.replace(/\bto\b\s*\./gi, '.');
  cleaned = cleaned.replace(/\bto\b\s*!/gi, '!');
  cleaned = cleaned.replace(/\bto\b\s*\?/gi, '?');

  // Fix dangling "at" (e.g. "I'm located at." -> "I'm located here.")
  cleaned = cleaned.replace(/\bat\b\s*\./gi, '.');
  cleaned = cleaned.replace(/\bat\b\s*!/gi, '!');
  cleaned = cleaned.replace(/\bat\b\s*\?/gi, '?');

  // Clean double punctuation
  // Replace 4 or more dots with 3 dots (standard ellipsis)
  cleaned = cleaned.replace(/\.{4,}/g, '...');
  // Replace exactly 2 dots with a single dot (prevent accidental typing "..")
  cleaned = cleaned.replace(/(?<!\.)\.{2}(?!\.)/g, '.');
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.replace(/\s+([.!?])/g, '$1');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

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
          const cleaned = fixGrammar(variation);
          if (cleaned !== variation) {
            changedCount++;
          }
          return cleaned;
        });
      }
    });
    
    if (changedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Polished grammar for ${changedCount} variations in ${file}`);
    }
  }
});
console.log('Grammar polish completed successfully!');
