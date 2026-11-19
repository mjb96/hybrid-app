// @ts-check
// =============================================================================
// MUSCLE LOAD MAP (js/analytics/muscle-load.js)
//
// Progress → Muscle load. Reuses the Volume Guide's per-muscle weekly credits
// and status, then adds the one thing a weekly total cannot show: when that
// muscle was last trained. Recovery is deliberately a simple elapsed-days
// label, not a fabricated physiological percentage.
// =============================================================================
import { buildVolumeGuideModel } from './volume-guide.js';
import { muscleCreditsForExercise } from '../exercises/catalog.js';
import { isCompletedSet, isWarmupSet } from '../set-utils.js';
import { daysBetween, localDayKey } from '../dates.js';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** @param {any} state @param {string} today */
function lastTrainedByMuscle(state, today) {
  /** @type {Map<string, string>} */
  const last = new Map();
  for (const week of Object.values(state?.weeks || {})) {
    if (!week || typeof week !== 'object') continue;
    for (const day of DAY_KEYS) {
      const date = week.dates?.[day];
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) continue;
      const lifts = week.lifts?.[day];
      if (!lifts || typeof lifts !== 'object') continue;
      for (const [liftName, sets] of Object.entries(lifts)) {
        if (!Array.isArray(sets) || !sets.some((set) => isCompletedSet(set) && !isWarmupSet(set))) continue;
        const credits = muscleCreditsForExercise(liftName);
        if (!credits) continue;
        for (const [muscle, weight] of Object.entries(credits)) {
          if (!(Number(weight) > 0)) continue;
          const previous = last.get(muscle);
          if (!previous || date > previous) last.set(muscle, date);
        }
      }
    }
  }
  return last;
}

/**
 * @param {any} state
 * @param {{ today?: string, weekStart?: string, program?: any }} [options]
 */
export function buildMuscleLoadModel(state, options = {}) {
  const today = options.today || localDayKey(new Date());
  const volume = buildVolumeGuideModel(state, { today, weekStart: options.weekStart, program: options.program });
  const last = lastTrainedByMuscle(state, today);
  const muscles = volume.muscles.map((row) => {
    const lastTrained = last.get(row.id) || null;
    const daysSince = lastTrained ? Math.max(0, daysBetween(lastTrained, today)) : null;
    const recovery = daysSince == null
      ? 'untrained'
      : daysSince <= 2
        ? 'recovering'
        : daysSince <= 4
          ? 'ready'
          : 'fresh';
    return { ...row, lastTrained, daysSince, recovery };
  });
  return {
    weekStart: volume.weekStart,
    weekEnd: volume.weekEnd,
    isCurrentWeek: volume.isCurrentWeek,
    muscles,
    summary: {
      ...volume.summary,
      recovering: muscles.filter((row) => row.recovery === 'recovering').length,
      ready: muscles.filter((row) => row.recovery === 'ready').length,
      fresh: muscles.filter((row) => row.recovery === 'fresh').length,
      untrained: muscles.filter((row) => row.recovery === 'untrained').length,
    },
  };
}
