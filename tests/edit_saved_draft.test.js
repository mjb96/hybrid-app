// ==========================================
// SAVED-WORKOUT DRAFT — add/remove exercise and set without losing history.
// The draft is a clone: nothing reaches the stored week until Save.
// ==========================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addExerciseToDraft, addSetToDraft, buildSavedWorkoutDraft,
  commitSavedWorkoutDraft, removeExerciseFromDraft, removeSetFromDraft,
} from '../js/workout/edit-saved.js';

function week() {
  return {
    sessionId: 'str_edit',
    dates: { mon: '2026-11-16' },
    lifts: { mon: { 'Bench Press': [{ w: '100', r: '5', c: true, basis: 'each' }] } },
    liftOrder: { mon: ['Bench Press'] },
    liftMeta: { mon: { 'Bench Press': { note: 'keep' }, Gone: { note: 'drop' } } },
    notes: { mon: 'Original' },
    sessionStatus: { mon: 'finished' },
    sessionSummary: { mon: { plannedSets: 1, completedSets: 1, skippedSets: 0, adherencePct: 100 } },
    runs: {}, runSessions: {},
  };
}

test('the draft is a clone; edits never touch the stored week', () => {
  const w = week();
  const draft = buildSavedWorkoutDraft(w, 'mon');
  draft.lifts['Bench Press'][0].w = '999';
  draft.notes = 'Changed';
  addExerciseToDraft(draft, 'Back Squat');
  assert.equal(w.lifts.mon['Bench Press'][0].w, '100');
  assert.equal(w.notes.mon, 'Original');
  assert.equal(w.lifts.mon['Back Squat'], undefined);
});

test('adding an exercise gives it one set in its natural shape', () => {
  const draft = buildSavedWorkoutDraft(week(), 'mon');
  assert.equal(addExerciseToDraft(draft, 'Plank'), true);
  assert.equal(draft.lifts.Plank[0].mode, 'time');
  assert.equal(addExerciseToDraft(draft, 'Farmer Carry'), true);
  assert.equal(draft.lifts['Farmer Carry'][0].mode, 'distance');
  assert.equal(addExerciseToDraft(draft, 'Bench Press'), false, 'duplicates are refused');
  assert.equal(addExerciseToDraft(draft, 'Barbell Bench Press'), false, 'catalogue aliases are refused');
  assert.deepEqual(draft.liftOrder, ['Bench Press', 'Plank', 'Farmer Carry']);
});

test('sets can be added and removed in the draft', () => {
  const draft = buildSavedWorkoutDraft(week(), 'mon');
  assert.equal(addSetToDraft(draft, 'Bench Press'), true);
  assert.equal(draft.lifts['Bench Press'].length, 2);
  assert.equal(removeSetFromDraft(draft, 'Bench Press', 0), true);
  assert.equal(draft.lifts['Bench Press'].length, 1);
  assert.equal(draft.lifts['Bench Press'][0].editNew, true);
  assert.equal(removeSetFromDraft(draft, 'Missing', 0), false);
});

test('removing an exercise removes it from the order but not its neighbours', () => {
  const draft = buildSavedWorkoutDraft(week(), 'mon');
  addExerciseToDraft(draft, 'Back Squat');
  assert.equal(removeExerciseFromDraft(draft, 'Bench Press'), true);
  assert.deepEqual(draft.liftOrder, ['Back Squat']);
  assert.equal(draft.lifts['Bench Press'], undefined);
});

test('commit drops empty new sets/exercises, stamps filled ones and keeps existing data', () => {
  const w = week();
  const draft = buildSavedWorkoutDraft(w, 'mon');
  draft.lifts['Bench Press'][0].w = '105';
  draft.lifts['Bench Press'][0].r = '4';
  draft.notes = 'Corrected';
  addExerciseToDraft(draft, 'Back Squat');
  draft.lifts['Back Squat'][0].w = '140';
  draft.lifts['Back Squat'][0].r = '5';
  addExerciseToDraft(draft, 'Plank');
  // Plank stays empty: it must be dropped, not saved as a blank exercise.
  commitSavedWorkoutDraft(w, 'mon', draft);

  assert.equal(w.sessionId, 'str_edit');
  assert.equal(w.dates.mon, '2026-11-16');
  assert.equal(w.lifts.mon['Bench Press'][0].w, '105');
  assert.equal(w.lifts.mon['Bench Press'][0].basis, 'each', 'existing metadata survives');
  assert.equal(w.lifts.mon['Bench Press'][0].c, true);
  assert.equal(w.lifts.mon['Back Squat'][0].c, true, 'a filled new set becomes completed');
  assert.equal(w.lifts.mon['Back Squat'][0].editNew, undefined);
  assert.equal(w.lifts.mon.Plank, undefined);
  assert.deepEqual(w.liftOrder.mon, ['Bench Press', 'Back Squat']);
  assert.equal(w.notes.mon, 'Corrected');
  assert.equal(w.liftMeta.mon.Gone, undefined, 'removed exercises lose stale metadata');
  assert.equal(w.liftMeta.mon['Bench Press'].note, 'keep');
  assert.equal(w.sessionSummary.mon.completedSets, 2);
  assert.equal(w.sessionSummary.mon.modified, true);
});

test('a hold added to a saved session stores seconds, not invented reps', () => {
  const w = week();
  const draft = buildSavedWorkoutDraft(w, 'mon');
  addExerciseToDraft(draft, 'Plank');
  draft.lifts.Plank[0].w = '20';
  draft.lifts.Plank[0].sec = 90;
  commitSavedWorkoutDraft(w, 'mon', draft);
  assert.deepEqual(w.lifts.mon.Plank, [{ w: '20', r: '', c: true, mode: 'time', sec: 90 }]);
});
