// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsv,
  parseWorkoutCsv,
  applyWorkoutCsvImport,
} from '../js/portability/import-workout-csv.js';

const openGymCsv = `date,start_time,end_time,workout,workout_note,exercise,exercise_id,set,set_type,weight,unit,reps,rpe,rir,distance_km,seconds
2026-11-02,2026-11-02 09:00,2026-11-02 10:05,Push A,Good session,Bench Press,0025,1,warmup,60,kg,8,,,,
2026-11-02,2026-11-02 09:00,2026-11-02 10:05,Push A,Good session,Bench Press,0025,2,normal,100,kg,5,8,2,,
2026-11-02,2026-11-02 09:00,2026-11-02 10:05,Push A,Good session,"Row, Seated",0115,1,normal,70,kg,10,,2,,
2026-11-02,2026-11-02 18:00,2026-11-02 18:30,Evening,Cardio only,Treadmill,,1,normal,,,,,,2.5,1500
`;

const strongCsv = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2026-11-03,Upper,60,Overhead Press,1,50,5,,,,,8
2026-11-03,Upper,60,Overhead Press,2,50,5,,,,,9
`;

const hevyCsv = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
Legs,2026-11-04 07:00,2026-11-04 08:00,Heavy day,Back Squat,,,1,normal,120,5,,,8.5
`;

test('parseCsv handles quotes, doubled quotes and CRLF', () => {
  const rows = parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'he said "hi"']]);
});

test('parses OpenGym rows into sessions, warm-ups and effort', () => {
  const parsed = parseWorkoutCsv(openGymCsv, { unit: 'kg' });
  assert.equal(parsed.sessions.length, 1);
  assert.equal(parsed.skippedCardio, 1);
  assert.equal(parsed.totalSets, 3);

  const push = parsed.sessions[0];
  assert.equal(push.date, '2026-11-02');
  assert.equal(push.day, 'mon');
  assert.equal(push.name, 'Push A');
  assert.equal(push.note, 'Good session');
  assert.equal(push.entries['Bench Press'].length, 2);
  assert.equal(push.entries['Bench Press'][0].type, 'W');
  assert.equal(push.entries['Bench Press'][1].rpe, 8);
  assert.equal(push.entries['Bench Press'][1].rir, 2);
  assert.deepEqual(Object.keys(push.entries), ['Bench Press', 'Row, Seated']);
});

test('accepts Strong and Hevy headers', () => {
  const strong = parseWorkoutCsv(strongCsv, { unit: 'kg' });
  assert.equal(strong.sessions.length, 1);
  assert.equal(strong.sessions[0].entries['Overhead Press'].length, 2);

  const hevy = parseWorkoutCsv(hevyCsv, { unit: 'kg' });
  assert.equal(hevy.sessions.length, 1);
  assert.equal(hevy.sessions[0].entries['Back Squat'][0].rpe, 8.5);
});

test('converts a row in pounds into the profile unit', () => {
  const csv = 'date,exercise,weight,unit,reps\n2026-11-02,Bench,100,lb,5\n';
  const parsed = parseWorkoutCsv(csv, { unit: 'kg' });
  assert.equal(parsed.sessions[0].entries.Bench[0].w, '45.36');

  const kg = parseWorkoutCsv(csv, { unit: 'lbs' });
  assert.equal(kg.sessions[0].entries.Bench[0].w, '100');
});

test('rejects non-workout CSV shapes', () => {
  assert.throws(() => parseWorkoutCsv('', { unit: 'kg' }));
  assert.throws(() => parseWorkoutCsv('date,note\n2026-11-02,hello\n', { unit: 'kg' }));
});

test('maps common external names onto Helyx catalogue names', () => {
  const parsed = parseWorkoutCsv('date,exercise,weight,reps\n2026-11-02,Barbell Deadlift,100,5\n', { unit: 'kg' });
  const state = { currentWeek: '1', weeks: {}, customExercises: [] };
  const result = applyWorkoutCsvImport(state, parsed, {
    resolveName: (name) => (name === 'Conventional Deadlift' ? 'Conventional Deadlift' : null),
  });
  assert.equal(result.added.length, 1);
  assert.deepEqual(Object.keys(state.weeks[result.added[0]].lifts.mon), ['Conventional Deadlift']);
  assert.deepEqual(state.customExercises, []);
});

test('applies an import into archived weeks and is idempotent', () => {
  const parsed = parseWorkoutCsv(openGymCsv, { unit: 'kg' });
  const state = { currentWeek: '1', weeks: {}, customExercises: [] };
  const options = {
    resolveName: (name) => (name === 'Bench Press' ? 'Barbell Bench Press' : null),
  };
  const first = applyWorkoutCsvImport(state, parsed, options);
  assert.equal(first.added.length, 1);
  assert.equal(first.sets, 3);
  assert.equal(state.currentWeek, '1');
  assert.ok(!state.weeks['1']);

  const week = state.weeks[first.added[0]];
  assert.equal(week.sessionTitle, 'Push A');
  assert.equal(week.activationId, 'imported');
  assert.equal(week.sessionStatus.mon, 'finished');
  assert.equal(week.dates.mon, '2026-11-02');
  assert.equal(week.gymStats.mon.time, '65:00');
  assert.deepEqual(week.lifts.mon['Barbell Bench Press'].map((s) => s.r), ['8', '5']);
  assert.ok(week.lifts.mon['Row, Seated']);
  assert.ok(state.customExercises.includes('Row, Seated'));

  const second = applyWorkoutCsvImport(state, parsed, options);
  assert.equal(second.added.length, 0);
  assert.equal(second.skipped.length, 1);
  assert.equal(second.sets, 0);
});
