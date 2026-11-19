// @ts-check
// =============================================================================
// PROGRESSION STYLES (js/programs/progression-style.js)
//
// A program-level choice for how the coach turns a completed session into the
// next load. Pure data + validation so the engine, the program editor and the
// docs can share one vocabulary.
//
//   double    — chase the rep target, then add load (the existing default)
//   linear    — add load when every top set hits the target; hold on a miss
//   rep-first — build two reps past the target at the same load, then add load
// =============================================================================

export const DEFAULT_PROGRESSION_STYLE = 'double';

export const PROGRESSION_STYLES = Object.freeze([
  {
    id: 'double',
    label: 'Double progression',
    blurb: 'Chase the rep target, then add load.',
    detail: 'If a top set misses the rep target, keep the load and chase one more rep. When every top set hits it, add one increment.',
  },
  {
    id: 'linear',
    label: 'Linear',
    blurb: 'Add load whenever every top set hits the target.',
    detail: 'Fixed reps. A clean session adds one increment; any missed top set holds the same load until it is completed.',
  },
  {
    id: 'rep-first',
    label: 'Rep-first',
    blurb: 'Build two reps past the target before adding load.',
    detail: 'Keep the load and add reps until every top set reaches the target + 2, then add one increment and reset to the target.',
  },
]);

const STYLE_IDS = new Set(PROGRESSION_STYLES.map((style) => style.id));

/**
 * @param {unknown} value
 * @returns {'double'|'linear'|'rep-first'}
 */
export function normalizeProgressionStyle(value) {
  return STYLE_IDS.has(String(value)) ? /** @type {any} */ (String(value)) : DEFAULT_PROGRESSION_STYLE;
}

/**
 * @param {unknown} value
 */
export function progressionStyleLabel(value) {
  const id = normalizeProgressionStyle(value);
  return PROGRESSION_STYLES.find((style) => style.id === id)?.label || 'Double progression';
}
