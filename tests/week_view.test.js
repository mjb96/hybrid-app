import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_WEEK_HISTORY, buildDayRecap, buildPastWeekView, dayRecapHTML, weekOffsetLabel, weekRecapHTML } from '../js/home/week-view.js';

function state() {
  return {
    currentWeek: '1',
    activeProgramId: 'test',
    settings: { weightUnit: 'kg' },
    weeks: {
      '1': {
        dates: { mon: '2026-07-27', tue: '2026-07-28' },
        lifts: {
          mon: { 'Barbell Bench Press': [{ w: '80', r: '5', c: true }] },
          tue: { 'Barbell Row': [{ w: '70', r: '8', c: true }, { w: '70', r: '8', c: false }] },
        },
        runs: {}, runSessions: {}, gymStats: {},
      },
    },
  };
}

test('week labels are bounded and human', () => {
  assert.equal(weekOffsetLabel(0), 'This week');
  assert.equal(weekOffsetLabel(-1), 'Last week');
  assert.equal(weekOffsetLabel(-3), '3 weeks ago');
  assert.equal(weekOffsetLabel(-99), `${HOME_WEEK_HISTORY} weeks ago`);
});

test('a past week recaps only the dates inside that calendar week', () => {
  const view = buildPastWeekView(state(), { startISO: '2026-07-27', offset: -1 });
  assert.equal(view.offset, -1);
  assert.equal(view.doneCount, 2);
  assert.equal(view.sessions, 2);
  assert.equal(view.sets, 2); // the unticked row is not work
  assert.equal(view.volume, 80 * 5 + 70 * 8);
  assert.equal(view.muscles.hasData, true);
  assert.equal(view.cells[0].status, 'done');
  assert.equal(view.cells[2].status, 'rest');
});

test('a week with no logged dates reads as an honest rest week', () => {
  const view = buildPastWeekView(state(), { startISO: '2026-07-13', offset: -3 });
  assert.equal(view.sessions, 0);
  assert.equal(view.sets, 0);
  assert.equal(view.volume, 0);
  assert.equal(view.hasData, false);
  assert.equal(view.doneCount, 0);
});

test('the recap view carries sessions, volume, a heat map and a way back', () => {
  const view = buildPastWeekView(state(), { startISO: '2026-07-27', offset: -1 });
  const html = weekRecapHTML(view, { weightUnit: 'kg' });
  assert.match(html, /Week recap/);
  assert.match(html, /2 sessions/);
  assert.match(html, /960 kg/);
  assert.match(html, /Front body map/);
  assert.match(html, /data-action="home-week-today"/);
  assert.match(html, /data-week-offset="-1"/);
});

test('a rest week recap explains itself instead of rendering an empty map', () => {
  const view = buildPastWeekView(state(), { startISO: '2026-07-13', offset: -3 });
  const html = weekRecapHTML(view, { weightUnit: 'kg' });
  assert.match(html, /No training logged/);
  assert.doesNotMatch(html, /session-map/);
});

test('a day recap drills into one date with its own muscle map', () => {
  const recap = buildDayRecap(state(), '2026-07-27');
  assert.equal(recap.sets, 1);
  assert.equal(recap.volume, 400);
  assert.equal(recap.muscles.hasData, true);
  const html = dayRecapHTML({ date: '2026-07-27', recap }, { weightUnit: 'kg' });
  assert.match(html, /Workout recap/);
  assert.match(html, /400 kg/);
  assert.match(html, /Front body map/);
  assert.match(html, /data-action="home-week-recap"/);
  assert.match(html, /data-action="home-open-day-activity"/);
});

test('an untrained date has no day recap', () => {
  const recap = buildDayRecap(state(), '2026-07-29');
  assert.equal(recap.hasData, false);
  assert.equal(dayRecapHTML({ date: '2026-07-29', recap }), '');
});

test('a day recap uses the stored program day title when available', () => {
  const lookup = (id) => id === 'test'
    ? { days: { mon: { title: 'Push Strength' } } }
    : null;
  const recap = buildDayRecap(state(), '2026-07-27', undefined, lookup);
  assert.equal(recap.title, 'Push Strength');
});

test('a run-only day opens a recap with distance and no strength zeroes', () => {
  const s = state();
  s.weeks['1'].dates.wed = '2026-07-29';
  s.weeks['1'].runSessions = {
    wed: [{ sessionId: 'r1', dist: '5', time: '25:00', localDate: '2026-07-29', source: 'fit' }],
  };
  const recap = buildDayRecap(s, '2026-07-29');
  assert.equal(recap.hasData, true);
  assert.equal(recap.distanceKm, 5);
  assert.equal(recap.runCount, 1);
  assert.equal(recap.sets, 0);
  const html = dayRecapHTML({ date: '2026-07-29', recap }, { distanceUnit: 'km' });
  assert.match(html, /5 km/);
  assert.match(html, /Distance/);
  assert.doesNotMatch(html, /0 kg/);
});

test('a week recap reports distance for imported run weeks', () => {
  const s = state();
  s.weeks['1'].dates.wed = '2026-07-29';
  s.weeks['1'].runSessions = {
    wed: [{ sessionId: 'r1', dist: '5', time: '25:00', localDate: '2026-07-29', source: 'fit' }],
  };
  const view = buildPastWeekView(s, { startISO: '2026-07-27', offset: -1 });
  assert.equal(view.distanceKm, 5);
  const html = weekRecapHTML(view, { weightUnit: 'kg', distanceUnit: 'km' });
  assert.match(html, /5 km/);
  assert.match(html, /Distance/);
});
