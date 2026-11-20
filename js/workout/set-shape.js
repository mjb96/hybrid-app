// @ts-check
// =============================================================================
// SET SHAPE — reps vs timed hold vs loaded carry.
//
// The stored set always wins. A blank row takes the exercise's own default, so
// a Plank opens a time field and a Farmer Carry opens a distance field without
// anyone choosing a mode first. The default comes from catalogue METADATA
// (`movement: 'carry'`) and the exercise name, never from a guessed entry.
// =============================================================================
import { resolveExercise } from '../exercises/catalog.js';
import { SET_MODE, setModeOf } from '../set-utils.js';
import { getExercisePrefs } from './exercise-config.js';

const HOLD_NAME = /\b(plank|hold|hang|wall sit|isometric|l-sit|hollow body hold|superman hold)\b/i;

/**
 * The row shape this exercise starts in when the athlete has not chosen one.
 * @param {string} name
 * @returns {'reps'|'time'|'distance'}
 */
export function defaultSetModeForExercise(name) {
  if (!name) return SET_MODE.REPS;
  const canonical = resolveExercise(name);
  if (canonical?.movement === 'carry') return SET_MODE.DISTANCE;
  if (HOLD_NAME.test(`${canonical?.name || ''} ${name}`)) return SET_MODE.TIME;
  return SET_MODE.REPS;
}

/**
 * The athlete's chosen/default shape for a NEW row of this exercise.
 * @param {{ settings?: any }|null} state
 * @param {string} name
 * @returns {'reps'|'time'|'distance'}
 */
export function preferredSetMode(state, name) {
  const preferred = getExercisePrefs(state, name).mode;
  if (preferred === SET_MODE.REPS || preferred === SET_MODE.TIME || preferred === SET_MODE.DISTANCE) {
    return preferred;
  }
  return defaultSetModeForExercise(name);
}

/**
 * Resolve the mode to RENDER for one set. A stored set's shape is authoritative;
 * a blank/new set uses the athlete's per-exercise choice or the catalogue
 * default. `settings.exercisePrefs[key].mode` is the override.
 * @param {any} set
 * @param {string} name
 * @param {{ settings?: any }|null} [state]
 * @returns {'reps'|'time'|'distance'}
 */
export function effectiveSetMode(set, name, state = null) {
  if (set && (set.mode === SET_MODE.REPS || set.mode === SET_MODE.TIME || set.mode === SET_MODE.DISTANCE)) {
    return set.mode;
  }
  if (set && setModeOf(set) !== SET_MODE.REPS) return setModeOf(set);
  return preferredSetMode(state, name);
}
