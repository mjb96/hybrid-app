// @ts-check
// =============================================================================
// SESSION MUSCLES — what one session actually trained
//
// The Progress volume guide already decides how much each exercise credits each
// muscle (`muscleCreditsForExercise`: 1 for a primary mover, less for a
// synergist). This module sums those credits across the COMPLETED working sets
// of one day and turns them into the intensity map the body diagram renders.
//
// Deliberately not tonnage: a heavy compound would drown every accessory and a
// 1 kg lateral raise would look like it trained nothing. Credit-weighted sets
// are the same "effective sets" vocabulary the rest of the volume analytics use.
//
// Warm-ups and un-ticked rows are excluded. Unknown custom exercises have no
// catalogue credits, so they are left out rather than guessed at.
// =============================================================================
import { muscleCreditsForExercise } from '../exercises/catalog.js';
import { MUSCLE_LABELS } from '../analytics/calculations/volume-landmarks.js';
import { isCompletedSet, isWarmupSet } from '../set-utils.js';

/**
 * Anatomical muscle → the static body-map regions that represent it.
 *
 * The map is more detailed than our 19 analytical keys (upper/lower chest,
 * three delts, medial/lateral hamstrings), so one muscle can own several
 * regions. Overlaps are intentional: region intensity is the MAX of the muscles
 * that map to it, never a sum, so a chest exercise cannot double-paint the
 * upper chest by matching both `chest` and `upper_chest`.
 *
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const MUSCLE_REGIONS = Object.freeze({
  chest: ['chest-upper-left', 'chest-lower-left', 'chest-upper-right', 'chest-lower-right'],
  upper_chest: ['chest-upper-left', 'chest-upper-right'],
  lats: [
    'lats-upper-left', 'lats-mid-left', 'lats-lower-left',
    'lats-upper-right', 'lats-mid-right', 'lats-lower-right',
  ],
  upper_back: [
    'traps-upper-left', 'traps-mid-left', 'traps-upper-right', 'traps-mid-right',
    'lats-upper-left', 'lats-upper-right',
  ],
  traps: [
    'traps-upper-left', 'traps-mid-left', 'traps-lower-left',
    'traps-upper-right', 'traps-mid-right', 'traps-lower-right',
  ],
  erectors: [
    'lower-back-erectors-left', 'lower-back-erectors-right',
    'lower-back-ql-left', 'lower-back-ql-right', 'spine',
  ],
  quads: ['quads-left', 'quads-right'],
  hamstrings: [
    'hamstrings-medial-left', 'hamstrings-lateral-left',
    'hamstrings-medial-right', 'hamstrings-lateral-right',
  ],
  glutes: [
    'gluteus-maximus-left', 'gluteus-medius-left',
    'gluteus-maximus-right', 'gluteus-medius-right',
  ],
  adductors: ['adductors-left', 'adductors-right'],
  calves: [
    'calves-gastroc-medial-left', 'calves-gastroc-lateral-left', 'calves-soleus-left',
    'calves-gastroc-medial-right', 'calves-gastroc-lateral-right', 'calves-soleus-right',
  ],
  front_delts: ['shoulder-front-left', 'shoulder-front-right'],
  side_delts: ['shoulder-side-left', 'shoulder-side-right'],
  rear_delts: ['deltoid-rear-left', 'deltoid-rear-right'],
  biceps: ['biceps-left', 'biceps-right'],
  triceps: [
    'triceps-long-left', 'triceps-lateral-left',
    'triceps-long-right', 'triceps-lateral-right',
  ],
  // The map has no separate brachialis region; it sits under the biceps.
  brachialis: ['biceps-left', 'biceps-right'],
  forearms: [
    'forearm-left', 'forearm-right',
    'forearm-flexors-left', 'forearm-extensors-left',
    'forearm-flexors-right', 'forearm-extensors-right',
  ],
  core: [
    'abs-upper-left', 'abs-upper-right', 'abs-lower-left', 'abs-lower-right',
    'obliques-left', 'obliques-right',
    'serratus-anterior-left', 'serratus-anterior-right',
  ],
});

/**
 * @typedef {object} SessionMuscle
 * @property {string} id
 * @property {string} label
 * @property {number} credit       total catalogue credit across the session
 * @property {number} intensity    0..1, normalised to the hardest-trained muscle
 * @property {boolean} primary     earned full credit from at least one set
 */

/**
 * @typedef {object} SessionMuscles
 * @property {SessionMuscle[]} muscles  sorted, hardest-trained first
 * @property {SessionMuscle[]} top      the first six, for the text chips
 * @property {Record<string, number>} regions  body-region id → 0..1 intensity
 * @property {boolean} hasData
 */

/**
 * @param {Record<string, any[]>|null|undefined} lifts  one day's lifts object
 * @returns {SessionMuscles}
 */
export function buildSessionMuscles(lifts) {
  /** @type {Map<string, { credit: number, primary: boolean }>} */
  const totals = new Map();
  let completedWorkingSets = 0;

  for (const [liftName, sets] of Object.entries(lifts || {})) {
    if (!Array.isArray(sets)) continue;
    const credits = muscleCreditsForExercise(liftName);
    if (!credits) continue;
    for (const set of sets) {
      if (!isCompletedSet(set) || isWarmupSet(set)) continue;
      completedWorkingSets += 1;
      for (const [muscle, rawCredit] of Object.entries(credits)) {
        const credit = Number(rawCredit);
        if (!(credit > 0)) continue;
        const current = totals.get(muscle) || { credit: 0, primary: false };
        current.credit += credit;
        if (credit >= 1) current.primary = true;
        totals.set(muscle, current);
      }
    }
  }

  const max = Math.max(0, ...[...totals.values()].map((value) => value.credit));
  /** @type {SessionMuscle[]} */
  const muscles = [...totals.entries()]
    .map(([id, value]) => ({
      id,
      label: MUSCLE_LABELS[id] || id,
      credit: value.credit,
      intensity: max > 0 ? value.credit / max : 0,
      primary: value.primary,
    }))
    .sort((a, b) => b.credit - a.credit || a.label.localeCompare(b.label));

  /** @type {Record<string, number>} */
  const regions = {};
  for (const muscle of muscles) {
    for (const region of MUSCLE_REGIONS[muscle.id] || []) {
      regions[region] = Math.max(regions[region] || 0, muscle.intensity);
    }
  }

  return {
    muscles,
    top: muscles.slice(0, 6),
    regions,
    hasData: completedWorkingSets > 0 && muscles.length > 0,
  };
}
