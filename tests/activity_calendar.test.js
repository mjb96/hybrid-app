import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildActivityCalendar, latestActivityMonth, shiftCalendarMonth,
} from '../js/activities/calendar.js';

const row = (localDate, kind, id) => ({ id, localDate, kind, title: id });

test('calendar groups the same History rows by real date', () => {
  const rows = [
    row('2026-11-04', 'run', 'run-1'),
    row('2026-11-04', 'strength', 'strength-1'),
    row('2026-11-18', 'strength', 'strength-2'),
  ];
  const cal = buildActivityCalendar(rows, 2026, 10, 'mon');
  assert.equal(cal.label, 'November 2026');
  const day4 = cal.cells.find((cell) => cell.date === '2026-11-04');
  assert.equal(day4.rows.length, 2);
  assert.equal(day4.strength, 1);
  assert.equal(day4.runs, 1);
  const day18 = cal.cells.find((cell) => cell.date === '2026-11-18');
  assert.equal(day18.strength, 1);
});

test('calendar respects the Sunday week start', () => {
  const mon = buildActivityCalendar([], 2026, 10, 'mon');
  const sun = buildActivityCalendar([], 2026, 10, 'sun');
  // 1 Nov 2026 is a Sunday: Monday-start needs 6 leading blanks, Sunday-start 0.
  assert.equal(mon.cells.filter((cell) => !cell.date).length, 6);
  assert.equal(sun.cells.filter((cell) => !cell.date).length, 0);
  assert.equal(sun.cells.find((cell) => cell.date === '2026-11-01').day, 1);
});

test('month navigation rolls across the year', () => {
  assert.deepEqual(shiftCalendarMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftCalendarMonth(2026, 0, -1), { year: 2025, month: 11 });
});

test('the first calendar month is the newest activity month', () => {
  const rows = [row('2026-09-30', 'run', 'a'), row('2026-11-02', 'strength', 'b')];
  assert.deepEqual(latestActivityMonth(rows, new Date(2026, 0, 1)), { year: 2026, month: 10 });
  assert.deepEqual(latestActivityMonth([], new Date(2026, 0, 1)), { year: 2026, month: 0 });
});
