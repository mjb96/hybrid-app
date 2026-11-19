// =============================================================================
// MUSCLE LOAD MODEL TESTS
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMuscleLoadModel } from '../js/analytics/muscle-load.js';

const set = () => ({ w: '60', r: '8', c: true });

test('maps weekly volume to muscles and adds a last-trained recovery label', () => {
  const state = {
    settings: {},
    currentWeek: '1',
    weeks: {
      '1': {
        dates: { mon: '2026-11-16', tue: '2026-11-17' },
        lifts: {
          mon: { 'Bench Press': [set(), set()] },
          tue: { 'Back Squat': [set()] },
        },
      },
      '2': {
        dates: { mon: '2026-11-09' },
        lifts: { mon: { 'Back Squat': [set()] } },
      },
    },
  };
  const model = buildMuscleLoadModel(state, { today: '2026-11-19' });
  const chest = model.muscles.find((row) => row.id === 'chest');
  const quads = model.muscles.find((row) => row.id === 'quads');
  assert.ok(chest, 'chest is present');
  assert.ok(quads, 'quads are present');
  assert.equal(chest.lastTrained, '2026-11-16');
  assert.equal(chest.recovery, 'ready');
  assert.equal(quads.lastTrained, '2026-11-17');
  assert.equal(quads.recovery, 'recovering');
  assert.ok(model.summary.loggedCredits > 0);
});

test('a muscle not trained in this window is marked untrained', () => {
  const model = buildMuscleLoadModel({ settings: {}, weeks: {} }, { today: '2026-11-19' });
  assert.equal(model.muscles.length, 0);
  assert.equal(model.summary.untrained, 0);
});
