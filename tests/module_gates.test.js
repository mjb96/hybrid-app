// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrainLanding } from '../js/train/train-landing.js';
import { buildProgressLanding } from '../js/analytics/progress-landing.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const program = {
  name: 'Test', totalWeeks: 4,
  days: Object.fromEntries(DAYS.map((d) => [d, { title: d, lifts: ['Back Squat'], runs: 'Rest' }])),
};
const state = (modules = {}) => ({
  currentWeek: '1', activeProgramId: 'test',
  weeks: {
    '1': {
      dates: { mon: '2026-11-16' },
      lifts: {}, runs: {},
      runSessions: { mon: [{ sessionId: 'dummy_run', dist: '5', time: '25:00', localDate: '2026-11-16' }] },
    },
  },
  settings: { modules }, fastingSession: { active: true, history: [{ hours: 16 }] },
});

test('Train quick start follows the running and fasting modules', () => {
  const all = buildTrainLanding({ state: state(), program });
  assert.deepEqual(all.quickStart.map((a) => a.id), ['workout', 'run', 'walk', 'fast']);

  const noRun = buildTrainLanding({ state: state({ running: false }), program });
  assert.deepEqual(noRun.quickStart.map((a) => a.id), ['workout', 'fast']);

  const noRunNoFast = buildTrainLanding({ state: state({ running: false, fasting: false }), program });
  assert.deepEqual(noRunNoFast.quickStart.map((a) => a.id), ['workout']);

  // Dummy cardio data: the run is visible while Running is on and filtered out
  // when the module is off.
  assert.ok(all.recent.some((row) => row.kind === 'run'));
  assert.ok(!noRun.recent.some((row) => row.kind === 'run'));
});

test('Progress drops hidden domains and destinations', () => {
  const all = buildProgressLanding(state(), { days: DAYS, today: '2026-11-19' });
  assert.ok(all.domains.some((d) => d.id === 'running'));
  assert.ok(all.domains.some((d) => d.id === 'recovery'));
  assert.ok(all.secondary.some((d) => d.id === 'fasting'));

  const hidden = buildProgressLanding(state({ running: false, recovery: false, fasting: false }), { days: DAYS, today: '2026-11-19' });
  assert.ok(!hidden.domains.some((d) => d.id === 'running'));
  assert.ok(!hidden.domains.some((d) => d.id === 'recovery'));
  assert.ok(!hidden.secondary.some((d) => d.id === 'fasting' || d.id === 'projections'));
});
