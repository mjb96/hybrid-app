// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHomeWeekStrip } from '../js/home/week-strip.js';

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const program = {
  days: {
    mon: { title: 'Push', lifts: ['Bench Press'], runs: 'Rest' },
    tue: { title: 'Pull', lifts: ['Row'], runs: 'Rest' },
    wed: { title: 'Legs', lifts: ['Squat'], runs: 'Rest' },
    thu: { title: 'Run', lifts: [], runs: 'Easy 5 km' },
    fri: { title: 'Push', lifts: ['Press'], runs: 'Rest' },
    sat: { title: 'Rest', lifts: [], runs: 'Rest' },
    sun: { title: 'Rest', lifts: [], runs: 'Rest' },
  },
};

const state = {
  currentWeek: '1',
  weekStartedAt: '2026-11-16',
  settings: { weekStartDay: 'mon' },
  weeks: {
    '1': {
      dates: {
        mon: '2026-11-16', tue: '2026-11-17', wed: '2026-11-18', thu: '2026-11-19',
        fri: '2026-11-20', sat: '2026-11-21', sun: '2026-11-22',
      },
      lifts: {
        mon: { 'Bench Press': [{ w: '80', r: '5', c: true }] },
        tue: { Row: [{ w: '60', r: '8', c: false }] },
      },
      runSessions: {},
    },
  },
};

test('marks done, today, missed and rest days', () => {
  const strip = buildHomeWeekStrip({ state, program, days, today: '2026-11-19' });
  const byDay = Object.fromEntries(strip.days.map((d) => [d.day, d]));
  assert.equal(byDay.mon.status, 'done');
  assert.equal(byDay.tue.status, 'missed');
  assert.equal(byDay.wed.status, 'missed');
  assert.equal(byDay.thu.status, 'today');
  assert.equal(byDay.fri.status, 'planned');
  assert.equal(byDay.sat.status, 'rest');
  assert.equal(strip.doneCount, 1);
  assert.equal(strip.plannedCount, 5);
});

test('a completed run counts as done and respects the week start', () => {
  state.weeks['1'].runSessions.thu = [{ sessionId: 'r1', dist: '5', time: '27:00' }];
  state.settings.weekStartDay = 'sun';
  const strip = buildHomeWeekStrip({ state, program, days, today: '2026-11-19' });
  assert.equal(strip.days[0].day, 'sun');
  assert.equal(strip.days.find((d) => d.day === 'thu').status, 'done');
  state.settings.weekStartDay = 'mon';
  delete state.weeks['1'].runSessions.thu;
});

test('a rest-only week reports no plan percentage', () => {
  const restProgram = { days: Object.fromEntries(days.map((d) => [d, { title: 'Rest', lifts: [], runs: 'Rest' }])) };
  const restState = { currentWeek: '1', settings: { weekStartDay: 'mon' }, weeks: { '1': { dates: Object.fromEntries(days.map((d, i) => [d, `2026-11-${16 + i}`])) } } };
  const strip = buildHomeWeekStrip({ state: restState, program: restProgram, days, today: '2026-11-19' });
  assert.equal(strip.plannedCount, 0);
  assert.equal(strip.pct, null);
});
