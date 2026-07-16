/**
 * Normalizes input text by stripping punctuation, lowercasing, and mapping
 * synonymous phrasing to canonical game intent strings.
 */
export function normalizeIntent(input: string): string {
  if (!input) return 'SILENT_LINE';

  // Lowercase, trim, and strip punctuation/symbols (including single and double quotes)
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"]/g, '');

  // Dictionary of word substitutions for common typos/shorthands
  const words = normalized.split(/\s+/);
  const mappedWords = words.map((word) => {
    switch (word) {
      case 'u':
        return 'you';
      case 'ur':
        return 'your';
      case 'r':
        return 'are';
      case 'wher':
        return 'where';
      case 'whers':
        return 'where';
      case 'loc':
        return 'location';
      case 'addr':
        return 'address';
      case 'pos':
        return 'position';
      case 'coord':
        return 'coordinate';
      case 'coords':
        return 'coordinate';
      default:
        return word;
    }
  });
  const processed = mappedWords.join(' ');

  // 1. Negation detection
  // Remove safe phrases containing negations so they don't trigger the general negation check
  let checkNegation = processed;
  const safePhrases = [
    'dont panic',
    'dont worry',
    'dont move',
    'dont hang up',
    'do not move',
    'do not hang up'
  ];
  for (const safe of safePhrases) {
    checkNegation = checkNegation.replace(safe, '');
  }
  const negationWords = ['not', 'no', 'dont', 'never', 'stop', 'cant', 'cannot'];
  const wordsInCheck = checkNegation.split(/\s+/);
  const hasNegation = wordsInCheck.some((w) => negationWords.includes(w));

  // If a general negation is found outside of safe phrases, fall back to LLM processing
  if (hasNegation) {
    return processed.toUpperCase().replace(/\s+/g, '_').substring(0, 30);
  }

  // Define canonical matchers with keywords and phrasal patterns.
  // Order matters: TELL_CALM_DOWN is placed before ASK_BREATHING to ensure
  // instruction phrases (e.g., "take a breath") map to calming down rather than asking status.
  const MATCHERS = [
    {
      intent: 'ASK_LOCATION',
      keywords: [
        'where',
        'address',
        'location',
        'street',
        'place',
        'coordinate',
        'position',
        'landmark',
        'intersection',
        'crossroad',
        'block',
        'zipcode',
        'apartment',
        'apt',
        'whereabouts',
        'whers'
      ]
    },
    {
      intent: 'TELL_CALM_DOWN',
      keywords: ['calm', 'relax', 'steady', 'fine', 'safe', 'chill', 'worry'],
      phrases: [
        'take a breath',
        'dont panic',
        'deep breath',
        'everything will be fine',
        'everything is fine',
        'everything will be ok',
        'everything is ok',
        'you are safe',
        'we are here',
        'help is on the way',
        'help is coming',
        'breathe with me',
        'slow down',
        'take it easy',
        'dont worry',
        'its okay',
        'its ok',
        'it is okay',
        'it is ok'
      ]
    },
    {
      intent: 'ASK_BREATHING',
      keywords: [
        'breathing',
        'breath',
        'conscious',
        'awake',
        'respond',
        'pulse',
        'heartbeat',
        'alive',
        'unconscious',
        'fainted',
        'choking',
        'suffocating'
      ],
      phrases: ['passed out', 'pass out']
    },
    {
      intent: 'ASK_WEAPONS',
      keywords: [
        'weapon',
        'gun',
        'knife',
        'armed',
        'pistol',
        'shoot',
        'threat',
        'blade',
        'blades',
        'firearm',
        'rifle',
        'handgun',
        'dagger',
        'sword',
        'shotgun',
        'bomb',
        'explosive'
      ]
    },
    {
      intent: 'ASK_CALLER_NAME',
      keywords: ['name', 'identify', 'callsign'],
      phrases: ['who is this', 'who are you']
    },
    {
      intent: 'ASK_DETAILS',
      keywords: [
        'describe',
        'details',
        'explain',
        'situation',
        'ongoing',
        'happen',
        'wrong',
        'problem',
        'emergency'
      ],
      phrases: [
        'what happened',
        'what is going on',
        'what is happening',
        'tell me what',
        'nature of'
      ]
    },
    {
      intent: 'TELL_EVACUATE',
      keywords: ['evacuate', 'leave', 'exit', 'run', 'outside', 'escape', 'flee'],
      phrases: ['get out', 'get away', 'clear out']
    },
    {
      intent: 'TELL_STAY_PUT',
      keywords: ['hide', 'lock'],
      phrases: [
        'stay put',
        'stay there',
        'dont move',
        'stay inside',
        'wait there',
        'stay where you are',
        'remain there',
        'do not move',
        'stay on the line',
        'dont hang up',
        'stay with me'
      ]
    },
    {
      intent: 'TELL_FIRST_AID',
      keywords: ['cpr', 'compression', 'pressure', 'wound', 'bleeding', 'bandage', 'tourniquet'],
      phrases: ['first aid', 'help him', 'help her', 'stop the bleed', 'medical help']
    }
  ];

  const matchedIntents = new Set<string>();

  for (const matcher of MATCHERS) {
    const isKeywordMatched = matcher.keywords.some((keyword) => {
      // Avoid matching 'breath' for ASK_BREATHING if it's part of a calm-down phrase
      if (matcher.intent === 'ASK_BREATHING' && keyword === 'breath') {
        if (
          processed.includes('take a breath') ||
          processed.includes('deep breath') ||
          processed.includes('breathe with me')
        ) {
          return false;
        }
      }

      if (keyword.length <= 3) {
        return mappedWords.includes(keyword);
      }
      return processed.includes(keyword);
    });

    const isPhraseMatched =
      matcher.phrases &&
      matcher.phrases.some((phrase) => {
        if (phrase.length <= 3) {
          return mappedWords.includes(phrase);
        }
        return processed.includes(phrase);
      });

    if (isKeywordMatched || isPhraseMatched) {
      matchedIntents.add(matcher.intent);
    }
  }

  // Only return a fast-path intent if there is exactly one match.
  // Otherwise (0 or 2+ intents), fall through to the LLM/caching pipeline.
  if (matchedIntents.size === 1) {
    return Array.from(matchedIntents)[0];
  }

  // Fallback: convert the cleaned input into a standardized uppercase key (e.g. "is he bleeding" -> "IS_HE_BLEEDING")
  return processed.toUpperCase().replace(/\s+/g, '_').substring(0, 30);
}
