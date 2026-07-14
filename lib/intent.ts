/**
 * Normalizes input text by stripping punctuation, lowercasing, and mapping
 * synonymous phrasing to canonical game intent strings.
 */
export function normalizeIntent(input: string): string {
  if (!input) return 'SILENT_LINE';

  // Lowercase, trim, and strip punctuation/symbols
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');

  // Synonym Mapping

  // 1. ASK_LOCATION
  if (
    normalized.includes('where') ||
    normalized.includes('address') ||
    normalized.includes('location') ||
    normalized.includes('street') ||
    normalized.includes('place') ||
    normalized.includes('coordinate') ||
    normalized.includes('position')
  ) {
    return 'ASK_LOCATION';
  }

  // 2. ASK_BREATHING
  if (
    normalized.includes('breathing') ||
    normalized.includes('breath') ||
    normalized.includes('conscious') ||
    normalized.includes('awake') ||
    normalized.includes('respond') ||
    normalized.includes('pulse') ||
    normalized.includes('heartbeat') ||
    normalized.includes('alive')
  ) {
    return 'ASK_BREATHING';
  }

  // 3. ASK_WEAPONS
  if (
    normalized.includes('weapon') ||
    normalized.includes('gun') ||
    normalized.includes('knife') ||
    normalized.includes('armed') ||
    normalized.includes('pistol') ||
    normalized.includes('shoot') ||
    normalized.includes('threat') ||
    normalized.includes('knife') ||
    normalized.includes('blades')
  ) {
    return 'ASK_WEAPONS';
  }

  // 4. ASK_CALLER_NAME
  if (
    normalized.includes('name') ||
    normalized.includes('who is this') ||
    normalized.includes('who are you') ||
    normalized.includes('identify')
  ) {
    return 'ASK_CALLER_NAME';
  }

  // 5. ASK_DETAILS
  if (
    normalized.includes('what happened') ||
    normalized.includes('what is going on') ||
    normalized.includes('what is happening') ||
    normalized.includes('describe') ||
    normalized.includes('details') ||
    normalized.includes('explain') ||
    normalized.includes('situation') ||
    normalized.includes('tell me what')
  ) {
    return 'ASK_DETAILS';
  }

  // 6. TELL_CALM_DOWN
  if (
    normalized.includes('calm') ||
    normalized.includes('relax') ||
    normalized.includes('take a breath') ||
    normalized.includes('dont panic') ||
    normalized.includes("don't panic") ||
    normalized.includes('deep breath') ||
    normalized.includes('steady')
  ) {
    return 'TELL_CALM_DOWN';
  }

  // 7. TELL_EVACUATE
  if (
    normalized.includes('evacuate') ||
    normalized.includes('get out') ||
    normalized.includes('leave') ||
    normalized.includes('exit') ||
    normalized.includes('run') ||
    normalized.includes('outside') ||
    normalized.includes('escape')
  ) {
    return 'TELL_EVACUATE';
  }

  // 8. TELL_STAY_PUT
  if (
    normalized.includes('stay put') ||
    normalized.includes('stay there') ||
    normalized.includes('dont move') ||
    normalized.includes("don't move") ||
    normalized.includes('hide') ||
    normalized.includes('lock') ||
    normalized.includes('stay inside') ||
    normalized.includes('wait there') ||
    normalized.includes('stay where you are')
  ) {
    return 'TELL_STAY_PUT';
  }

  // 9. TELL_FIRST_AID
  if (
    normalized.includes('cpr') ||
    normalized.includes('compression') ||
    normalized.includes('first aid') ||
    normalized.includes('pressure') ||
    normalized.includes('wound') ||
    normalized.includes('bleeding') ||
    normalized.includes('help him') ||
    normalized.includes('help her') ||
    normalized.includes('bandage')
  ) {
    return 'TELL_FIRST_AID';
  }

  // Fallback: convert the cleaned input into a standardized uppercase key (e.g. "is he bleeding" -> "IS_HE_BLEEDING")
  return normalized.toUpperCase().replace(/\s+/g, '_').substring(0, 30);
}
