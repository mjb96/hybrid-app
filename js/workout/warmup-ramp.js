// @ts-check
// =============================================================================
// WARM-UP RAMP (js/workout/warmup-ramp.js)
//
// Auto-progression decides the working weight; the ramp is the short ladder that
// gets the athlete there safely. Pure and opt-in: the caller supplies the bar,
// plates and pairs owned, and the ramp only emits weights the rack can build.
// =============================================================================

import { computePlateBreakdown } from './plates.js';
import { isWarmupSet } from '../set-utils.js';

export const RAMP_SETS = Object.freeze([
  Object.freeze({ pct: 0.4, reps: 5 }),
  Object.freeze({ pct: 0.6, reps: 3 }),
  Object.freeze({ pct: 0.8, reps: 2 }),
]);

/** @param {number} value @param {number} step */
function roundTo(value, step) {
  if (!(step > 0)) return Math.round(value * 10) / 10;
  return Math.round(value / step) * step;
}

/**
 * Build editable warm-up rows for a barbell lift.
 *
 * The percentages apply to the weight ABOVE the bar, so a 100 kg squat on a
 * 20 kg bar ramps 52 / 68 / 84 kg rather than 40 / 60 / 80.
 *
 * @param {number|string} workingWeight
 * @param {{ bar?: number, plates?: number[], counts?: Record<string, number>, unit?: 'kg'|'lb'|string }} [setup]
 * @returns {Array<{ w: number, r: number, c: boolean, type: 'W', ramp: true }>}
 */
export function buildWarmupRamp(workingWeight, setup = {}) {
  const total = Number(workingWeight);
  const unit = setup.unit === 'lb' || setup.unit === 'lbs' ? 'lb' : 'kg';
  const bar = Number(setup.bar) > 0 ? Number(setup.bar) : (unit === 'lb' ? 45 : 20);
  const plates = Array.isArray(setup.plates) && setup.plates.length ? setup.plates : null;
  const counts = setup.counts || null;
  const increment = unit === 'lb' ? 5 : 2.5;
  if (!Number.isFinite(total) || total <= bar + 0.01) return [];

  /** @type {Array<{ w: number, r: number, c: boolean, type: 'W', ramp: true }>} */
  const rows = [];
  for (const step of RAMP_SETS) {
    const target = bar + (total - bar) * step.pct;
    let load = target;
    if (plates) {
      const breakdown = computePlateBreakdown(target, bar, plates, counts);
      load = breakdown.exact ? target : target - breakdown.leftover * 2;
    }
    load = roundTo(Math.max(bar + increment, Math.min(load, total - increment)), increment);
    if (!(load > bar) || load >= total) continue;
    if (rows.some((row) => row.w === load)) continue;
    rows.push({ w: load, r: step.reps, c: false, type: /** @type {const} */ ('W'), ramp: true });
  }
  return rows;
}

/**
 * Insert a ramp once for this lift/day, before the first working set. The stamp
 * in `liftMeta` means deleting a warm-up does not resurrect it on the next edit.
 *
 * @param {any} weekData
 * @param {string} day
 * @param {string} liftName
 * @param {number|string} workingWeight
 * @param {{ bar?: number, plates?: number[], counts?: Record<string, number>, unit?: string }} [setup]
 * @returns {boolean} whether rows were inserted
 */
export function addWarmupRamp(weekData, day, liftName, workingWeight, setup = {}) {
  const sets = weekData?.lifts?.[day]?.[liftName];
  if (!Array.isArray(sets) || sets.some(isWarmupSet)) return false;
  const meta = weekData?.liftMeta?.[day]?.[liftName];
  if (meta?.autoRamp) return false;
  const rows = buildWarmupRamp(workingWeight, setup);
  if (!rows.length) return false;
  sets.unshift(...rows);
  if (!weekData.liftMeta) weekData.liftMeta = {};
  if (!weekData.liftMeta[day]) weekData.liftMeta[day] = {};
  if (!weekData.liftMeta[day][liftName]) weekData.liftMeta[day][liftName] = {};
  weekData.liftMeta[day][liftName].autoRamp = true;
  return true;
}
