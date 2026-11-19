// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFitCandidate, applyFitImports } from '../js/portability/import-fit.js';

const start = new Date(2026, 10, 2, 6, 30, 0);

const runData = {
  sessions: [{
    start_time: start,
    total_distance: 5.2,
    total_timer_time: 1800,
    total_elapsed_time: 1860,
    avg_heart_rate: 151,
    max_heart_rate: 172,
    total_ascent: 42,
    total_calories: 380,
    avg_running_cadence: 170,
    total_training_effect: 3.4,
  }],
  laps: [
    { total_timer_time: 600, total_distance: 1.7, avg_heart_rate: 148 },
    { total_timer_time: 600, total_distance: 1.7, avg_heart_rate: 152 },
    { total_timer_time: 600, total_distance: 1.8, avg_heart_rate: 154 },
  ],
  records: [
    { position_lat: 100, position_long: 200, heart_rate: 145 },
    { position_lat: 101, position_long: 201, heart_rate: 155 },
  ],
};

const gymData = {
  sessions: [{
    start_time: new Date(2026, 10, 3, 18, 0, 0),
    total_timer_time: 2700,
    total_elapsed_time: 3000,
    total_calories: 220,
    avg_heart_rate: 118,
    max_heart_rate: 141,
  }],
};

test('a dated run FIT becomes a run candidate with its own date and identity', () => {
  const candidate = buildFitCandidate(runData);
  assert.equal(candidate?.kind, 'run');
  assert.equal(candidate?.localDate, '2026-11-02');
  assert.equal(candidate?.day, 'mon');
  assert.equal(candidate?.sessionId, `run_fit_${start.getTime().toString(36)}`);
  assert.equal(candidate?.run.dist, '5.20');
  assert.equal(candidate?.run.time, '30:00');
  assert.equal(candidate?.run.avgHR, 151);
  assert.equal(candidate?.run.maxHR, 172);
  assert.equal(candidate?.run.splits.length, 3);
  assert.equal(candidate?.coordinates.length, 2);
});

test('a strength FIT becomes a time/HR-only gym candidate, never guessed lifts', () => {
  const candidate = buildFitCandidate(gymData);
  assert.equal(candidate?.kind, 'gym');
  assert.equal(candidate?.localDate, '2026-11-03');
  assert.equal(candidate?.gym.time, '45:00');
  assert.equal(candidate?.gym.cals, 220);
  assert.equal(candidate?.gym.avgHR, 118);
});

test('applying FIT candidates archives exact dates and is idempotent', () => {
  const state = { currentWeek: '1', weeks: { 1: {} } };
  const candidates = [buildFitCandidate(runData), buildFitCandidate(gymData)];

  const first = applyFitImports(state, candidates);
  assert.equal(first.added.length, 2);
  const run = first.added.find((item) => item.kind === 'run');
  const gym = first.added.find((item) => item.kind === 'gym');

  const runWeek = state.weeks[run.weekKey];
  assert.equal(runWeek.source, 'fit-import');
  assert.equal(runWeek.dates.mon, '2026-11-02');
  assert.equal(runWeek.runSessions.mon.length, 1);
  assert.equal(runWeek.runSessions.mon[0].dist, '5.20');
  assert.equal(runWeek.runSessions.mon[0].source, 'fit');
  assert.equal(runWeek.runs.mon.sessionId, run.sessionId);

  const gymWeek = state.weeks[gym.weekKey];
  assert.equal(gymWeek.dates.tue, '2026-11-03');
  assert.equal(gymWeek.gymStats.tue.time, '45:00');
  assert.deepEqual(gymWeek.lifts.tue, {});
  assert.equal(gymWeek.sessionTitle, 'Imported Strength Activity');

  const second = applyFitImports(state, candidates);
  assert.equal(second.added.length, 0);
  assert.equal(second.skipped.length, 2);
  assert.equal(Object.keys(state.weeks).length, 3);
});

test('an undated FIT is skipped rather than dated to today', () => {
  const undated = {
    sessions: [{ total_distance: 3, total_timer_time: 900 }],
  };
  assert.equal(buildFitCandidate(undated), null);
});
