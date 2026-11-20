import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCalendarTrainingWeeks } from '../js/analytics/training-calendar.js';

const work = (w, r) => ({ c: true, w: String(w), r: String(r) });

test('training calendar includes imported and archived sessions by real date', () => {
  const state = {
    weeks: {
      '1': {
        dates: { mon: '2026-07-13' },
        lifts: { mon: { Bench: [work(100, 5)] } },
      },
      'arch:import:x': {
        activationId: 'imported',
        dates: { wed: '2026-07-15' },
        lifts: { wed: { Squat: [work(120, 5)] } },
        runSessions: {},
      },
    },
  };
  const cal = buildCalendarTrainingWeeks(state, { today: '2026-07-17', weeks: 12 });
  const gymDays = cal.trainingDays.filter((day) => day.gym && !day.run);
  assert.equal(gymDays.length, 2);
  assert.ok(gymDays.some((day) => day.date === '2026-07-13'));
  assert.ok(gymDays.some((day) => day.date === '2026-07-15' && day.week === 12));
  // Future days in the current week are not painted.
  assert.ok(!cal.trainingDays.some((day) => day.date > '2026-07-17'));
});

test('a run-only day is marked as a run, not a gym session', () => {
  const state = {
    weeks: {
      '1': {
        dates: { tue: '2026-07-14' },
        lifts: {},
        runSessions: { tue: [{ sessionId: 'r1', dist: '5', time: '25:00' }] },
      },
    },
  };
  const cal = buildCalendarTrainingWeeks(state, { today: '2026-07-17', weeks: 12 });
  const day = cal.trainingDays.find((entry) => entry.date === '2026-07-14');
  assert.equal(day.run, true);
  assert.equal(day.gym, false);
});

test('labels are spaced so twelve weeks do not overlap', () => {
  const cal = buildCalendarTrainingWeeks({ weeks: {} }, { today: '2026-07-17', weeks: 12 });
  assert.equal(cal.labels.length, 12);
  assert.equal(cal.labels.filter(Boolean).length, 4);
});
