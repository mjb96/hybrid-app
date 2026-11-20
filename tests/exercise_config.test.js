import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  WARMUP_MODE, exerciseConfigKey, getExerciseNote, getExercisePrefs,
  getExerciseRestOverride, getExerciseWarmupMode, preferredLoadBasis,
  preferredLoadMode, setExercisePref, setExerciseRestOverride, shouldAutoWarmup,
} from '../js/workout/exercise-config.js';

function state(settings = {}) {
  return { settings: { autoWarmupRamp: false, restOverrides: {}, exercisePrefs: {}, ...settings } };
}

test('preferences follow catalogue aliases when the exercise is known', () => {
  assert.equal(exerciseConfigKey('Barbell Bench Press'), exerciseConfigKey('Bench Press'));
  assert.notEqual(exerciseConfigKey('Made-up Lift'), exerciseConfigKey('Another Lift'));
});

test('note and warm-up mode are durable per exercise', () => {
  const s = state();
  setExercisePref(s, 'Back Squat', { note: 'Belt on', warmup: 'off' });
  assert.equal(getExerciseNote(s, 'Back Squat'), 'Belt on');
  assert.equal(getExerciseWarmupMode(s, 'Back Squat'), WARMUP_MODE.OFF);
  assert.equal(shouldAutoWarmup(s, 'Back Squat'), false, 'per-exercise Off beats the global switch');
  setExercisePref(s, 'Back Squat', { warmup: 'auto' });
  assert.equal(shouldAutoWarmup(s, 'Back Squat'), true, 'per-exercise Auto enables it');
  setExercisePref(s, 'Back Squat', { note: '', warmup: 'inherit' });
  assert.equal(getExerciseNote(s, 'Back Squat'), '');
  assert.equal(getExerciseWarmupMode(s, 'Back Squat'), WARMUP_MODE.INHERIT);
});

test('rest override supports default, custom seconds and no timer', () => {
  const s = state();
  assert.equal(getExerciseRestOverride(s, 'Row'), null);
  setExerciseRestOverride(s, 'Row', 90);
  assert.equal(getExerciseRestOverride(s, 'Row'), 90);
  setExerciseRestOverride(s, 'Row', 0);
  assert.equal(getExerciseRestOverride(s, 'Row'), 0);
  setExerciseRestOverride(s, 'Row', null);
  assert.equal(getExerciseRestOverride(s, 'Row'), null);
});

test('a set-shape preference is durable per exercise', () => {
  const s = state();
  setExercisePref(s, 'Farmer Carry', { mode: 'time' });
  assert.equal(getExercisePrefs(s, 'Farmer Carry').mode, 'time');
  setExercisePref(s, 'Farmer Carry', { mode: null });
  assert.equal(getExercisePrefs(s, 'Farmer Carry').mode, undefined);
});

test('getExercisePrefs never leaks the stored object', () => {
  const s = state();
  setExercisePref(s, 'Row', { note: 'cue' });
  const prefs = getExercisePrefs(s, 'Row');
  prefs.note = 'mutated';
  assert.equal(getExerciseNote(s, 'Row'), 'cue');
});

test('load defaults follow the exercise unless overridden', () => {
  const s = state();
  assert.equal(preferredLoadMode(s, 'Bench Press'), 'weighted');
  assert.equal(preferredLoadMode(s, 'Pull-Up'), 'bodyweight');
  setExercisePref(s, 'Bench Press', { loadMode: 'banded' });
  assert.equal(preferredLoadMode(s, 'Bench Press'), 'banded');
  setExercisePref(s, 'Pull-Up', { loadMode: 'weighted' });
  assert.equal(preferredLoadMode(s, 'Pull-Up'), 'weighted');
});

test('weight meaning defaults to Each / Per side by equipment and is overrideable', () => {
  const s = state();
  assert.equal(preferredLoadBasis(s, 'Incline Dumbbell Press'), 'each');
  assert.equal(preferredLoadBasis(s, 'Dumbbell Row'), 'per-side');
  assert.equal(preferredLoadBasis(s, 'Back Squat'), 'total');
  setExercisePref(s, 'Incline Dumbbell Press', { basis: 'total' });
  assert.equal(preferredLoadBasis(s, 'Incline Dumbbell Press'), 'total');
});
