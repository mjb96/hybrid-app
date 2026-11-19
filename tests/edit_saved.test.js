// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { updateStrengthSet, updateSavedRun } from '../js/workout/edit-saved.js';

function week() {
  return {
    dates: { mon: '2026-11-16' },
    lifts: { mon: { 'Bench Press': [{ w: '100', r: '5', c: true }, { w: '100', r: '5', c: true }] } },
    notes: { mon: '' },
    runs: {},
    runSessions: { mon: [{ sessionId: 'run1', dist: '5', time: '25:00', pace: '5:00', routeId: 'route:run1', source: 'fit', localDate: '2026-11-16', startTs: 1 }] },
  };
}

test('a saved strength set can be corrected without losing its completion flag', () => {
  const w = week();
  assert.equal(updateStrengthSet(w, 'mon', 'Bench Press', 1, { w: '105', r: '4' }), true);
  assert.deepEqual(w.lifts.mon['Bench Press'][1], { w: '105', r: '4', c: true });
  assert.equal(updateStrengthSet(w, 'mon', 'Bench Press', 9, { w: '1', r: '1' }), false);
  assert.equal(updateStrengthSet(w, 'mon', 'Missing', 0, { w: '1', r: '1' }), false);
});

test('a saved run keeps its identity and route while distance/time change', () => {
  const w = week();
  assert.equal(updateSavedRun(w, 'mon', 'run1', { dist: '10', time: '50:00', avgHR: '150', notes: 'corrected' }), true);
  const run = w.runSessions.mon[0];
  assert.equal(run.sessionId, 'run1');
  assert.equal(run.routeId, 'route:run1');
  assert.equal(run.source, 'fit');
  assert.equal(run.dist, '10');
  assert.equal(run.time, '50:00');
  assert.equal(run.pace, '5:00');
  assert.equal(run.avgHR, '150');
  assert.equal(run.notes, 'corrected');
  assert.equal(w.runs.mon.sessionId, 'run1');
});

test('a missing run returns false instead of inventing one', () => {
  const w = { dates: {}, lifts: {}, runs: {}, runSessions: {} };
  assert.equal(updateSavedRun(w, 'mon', 'nope', { dist: '5' }), false);
});
