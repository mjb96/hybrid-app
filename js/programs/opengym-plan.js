// @ts-check
// =============================================================================
// OPEN GYM PLAN IMPORT (js/programs/opengym-plan.js)
//
// openGym shares a weekly plan as `{ opengym_plan: 1, week, routines, customEx }`:
// weekdays map to routine ids, and each routine carries per-exercise sets, reps,
// starting weight, rest and warm-up rows. Its exercise ids resolve through the
// full openGym catalogue id map (including the MIT-licensed ExerciseDB text).
//
// Import creates a normal custom program. `day.lifts` stays an array of names
// (the rest of the app relies on that); the richer per-exercise prescription
// lives in the program's `prescriptions` sidecar, which liftTarget and the
// rest timer read without changing stored workout data.
// =============================================================================
import { OPENGYM_ID_NAMES } from '../exercises/opengym-catalogue.js';
import { secureRandomSuffix } from '../util/secure-id.js';

const DAY_BY_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const UNIT_FACTOR = 0.45359237;

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const finite = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const clampInt = (value, min, max, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

/** @param {unknown} value */
export function isOpenGymPlan(value) {
  return !!value && typeof value === 'object' && Number(/** @type {any} */ (value).opengym_plan) === 1;
}

/**
 * Parse an openGym plan file into a day→routine model. Does not mutate app state.
 * @param {string} raw
 */
export function parseOpenGymPlan(raw) {
  let data;
  try { data = JSON.parse(String(raw || '')); }
  catch { throw new Error('That file is not valid JSON.'); }
  if (!isOpenGymPlan(data)) throw new Error('That JSON is not an openGym plan.');
  if (!data.routines || !Array.isArray(data.routines)) throw new Error('The openGym plan has no routines.');
  if (!data.week || typeof data.week !== 'object') throw new Error('The openGym plan has no week schedule.');

  const custom = new Map();
  for (const item of Array.isArray(data.customEx) ? data.customEx : []) {
    const id = text(item?.id);
    const name = text(item?.name) || text(item?.n);
    if (id && name) custom.set(id, name);
  }
  const routineById = new Map();
  for (const routine of data.routines) {
    const id = text(routine?.id);
    if (id) routineById.set(id, routine);
  }

  const days = {};
  const prescriptions = {};
  const unknownIds = new Set();
  const unsupported = [];

  for (const [index, routineIds] of Object.entries(data.week)) {
    const day = DAY_BY_INDEX[Number(index)];
    if (!day || !Array.isArray(routineIds) || !routineIds.length) continue;
    const routines = routineIds.map((id) => routineById.get(String(id))).filter(Boolean);
    if (!routines.length) continue;

    const lifts = [];
    const dayPrescriptions = {};
    const titles = [];
    for (const routine of routines) {
      titles.push(text(routine.name) || 'Imported routine');
      for (const exercise of Array.isArray(routine.ex) ? routine.ex : []) {
        const sourceId = text(exercise?.id);
        const name = custom.get(sourceId) || OPENGYM_ID_NAMES[sourceId] || text(exercise?.name);
        if (!name) { if (sourceId) unknownIds.add(sourceId); continue; }
        const mode = text(exercise?.mode);
        if (mode === 'cardio' || mode === 'time' || mode === 'distance') {
          unsupported.push({ name, mode });
          continue;
        }
        const reps = finite(exercise?.reps) ?? finite(exercise?.repsMin);
        if (!(reps > 0)) { unsupported.push({ name, mode: 'missing-reps' }); continue; }
        if (!lifts.includes(name)) lifts.push(name);
        dayPrescriptions[name] = {
          sets: clampInt(exercise?.sets, 1, 20, 3),
          reps: clampInt(reps, 1, 200, 10),
          weight: finite(exercise?.weight),
          restSec: finite(exercise?.restSec),
          warmup: text(exercise?.warmup) || null,
          warmupRows: Array.isArray(exercise?.warmupRows) ? exercise.warmupRows.map((row) => ({
            pct: finite(row?.wp),
            reps: finite(row?.r),
          })).filter((row) => row.pct != null && row.reps != null) : [],
          progression: text(exercise?.prog) || null,
          repsMin: finite(exercise?.repsMin),
          repsMax: finite(exercise?.repsMax),
          side: exercise?.side === true,
          dbLoad: text(exercise?.dbLoad) || null,
        };
      }
    }
    if (lifts.length) {
      days[day] = {
        title: titles.join(' + ') || 'Imported routine',
        badge: titles.join(' + ') || 'Training',
        lifts,
      };
      prescriptions[day] = dayPrescriptions;
    }
  }

  if (!Object.keys(days).length) throw new Error('The openGym plan has no resolvable training days.');
  return {
    name: text(data.name) || 'Imported openGym Plan',
    unit: text(data.unit) === 'lb' ? 'lbs' : 'kg',
    days,
    prescriptions,
    unknownIds: [...unknownIds],
    unsupported,
    sessionsPerWeek: Object.keys(days).length,
  };
}

/**
 * Build a custom program from a parsed openGym plan.
 * @param {ReturnType<typeof parseOpenGymPlan>} plan
 * @param {{ unit?: 'kg'|'lbs', existingIds?: string[] }} [opts]
 */
export function createOpenGymProgram(plan, { unit = 'kg', existingIds = [] } = {}) {
  const ids = new Set(existingIds);
  let id;
  do { id = `prog_opengym_${Date.now().toString(36)}_${secureRandomSuffix(8)}`; } while (ids.has(id));
  const targetUnit = unit === 'lbs' ? 'lbs' : 'kg';
  const convert = (weight) => {
    if (!(weight > 0)) return weight;
    if (plan.unit === targetUnit) return weight;
    return targetUnit === 'kg' ? Math.round(weight * UNIT_FACTOR * 100) / 100 : Math.round(weight / UNIT_FACTOR * 100) / 100;
  };

  const days = {};
  const prescriptions = {};
  for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
    const source = plan.days[day];
    if (!source) {
      days[day] = { title: 'Rest', badge: 'Rest', color: 'var(--text-muted)', desc: '', runs: 'Rest', lifts: [] };
      continue;
    }
    days[day] = {
      title: source.title,
      badge: source.badge,
      color: 'var(--color-cyan)',
      desc: 'Imported from an openGym plan. Per-exercise targets and starting loads are preserved.',
      runs: 'Rest',
      lifts: source.lifts,
    };
    prescriptions[day] = Object.fromEntries(Object.entries(plan.prescriptions[day] || {}).map(([name, item]) => [
      name,
      { ...item, weight: convert(item.weight) },
    ]));
  }

  return {
    id,
    name: plan.name,
    totalWeeks: 1,
    sessionsPerWeek: plan.sessionsPerWeek,
    days,
    weeklyVolModifiers: { 1: { sets: 3, reps: 10, intensityLabel: 'Imported' } },
    prescriptions,
    dossier: {
      creator: 'Imported',
      focus: 'openGym plan',
      philosophy: 'A weekly plan imported from openGym. Each exercise keeps its original sets, reps, starting load and rest.',
    },
    sourceProgramId: null,
    isPrimaryCustomization: false,
    importedAt: new Date().toISOString(),
  };
}
