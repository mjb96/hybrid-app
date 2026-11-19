// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { isOpenGymPlan, parseOpenGymPlan, createOpenGymProgram } from '../js/programs/opengym-plan.js';
import { liftTarget, prescribeSetsForLift } from '../js/engine.js';

const source = {
  opengym_plan: 1,
  exported: '2026-11-20',
  name: 'Upper / Lower',
  unit: 'kg',
  week: { 1: ['upper'], 2: ['lower'], 4: ['upper'] },
  routines: [
    {
      id: 'upper',
      name: 'Upper A',
      ex: [
        { id: '0289', sets: 3, reps: 12, weight: 30, restSec: 90 },
        { id: '999999', sets: 3, reps: 10 },
      ],
    },
    {
      id: 'lower',
      name: 'Lower A',
      ex: [{ id: '0043', sets: 3, reps: 6, weight: 112.5, restSec: 240, repsMin: 5, repsMax: 6, prog: 'double' }],
    },
  ],
  customEx: [],
};

test('openGym plans map weekdays to days and report unknown ids', () => {
  const parsed = parseOpenGymPlan(JSON.stringify(source));
  assert.equal(parsed.name, 'Upper / Lower');
  assert.deepEqual(Object.keys(parsed.days), ['mon', 'tue', 'thu']);
  assert.deepEqual(parsed.days.mon.lifts, ['Dumbbell Bench Press']);
  assert.deepEqual(parsed.days.tue.lifts, ['Barbell Full Squat']);
  assert.deepEqual(parsed.unknownIds, ['999999']);
  assert.equal(parsed.prescriptions.mon['Dumbbell Bench Press'].sets, 3);
  assert.equal(parsed.prescriptions.mon['Dumbbell Bench Press'].reps, 12);
  assert.equal(parsed.prescriptions.tue['Barbell Full Squat'].restSec, 240);
});

test('creating a custom program keeps per-exercise prescriptions and converts units', () => {
  const parsed = parseOpenGymPlan(JSON.stringify(source));
  const program = createOpenGymProgram(parsed, { unit: 'lbs', existingIds: [] });
  assert.match(program.id, /^prog_opengym_/);
  assert.equal(program.totalWeeks, 1);
  assert.equal(program.days.mon.lifts[0], 'Dumbbell Bench Press');
  assert.equal(program.days.wed.title, 'Rest');
  assert.ok(program.prescriptions.mon['Dumbbell Bench Press'].weight > 66);
  assert.ok(program.prescriptions.mon['Dumbbell Bench Press'].weight < 67);
  assert.equal(program.prescriptions.tue['Barbell Full Squat'].progression, 'double');
});

test('liftTarget reads the imported prescription instead of the shared week modifier', () => {
  const parsed = parseOpenGymPlan(JSON.stringify(source));
  const program = createOpenGymProgram(parsed, { unit: 'kg' });
  const target = liftTarget('', 'Dumbbell Bench Press', { sets: 4, reps: 5 }, {
    program, week: '1', dayKey: 'mon',
  });
  assert.deepEqual(target, { sets: 3, reps: '12', weight: 30, restSec: 90 });
});

test('the cockpit materialises the imported set count, not the shared week modifier', () => {
  const parsed = parseOpenGymPlan(JSON.stringify(source));
  const program = createOpenGymProgram(parsed, { unit: 'kg' });
  const sets = prescribeSetsForLift('1', 'mon', 'Dumbbell Bench Press', '', { sets: 4, reps: 5 }, {
    program, week: '1', dayKey: 'mon',
  });
  assert.equal(sets.length, 3);
  assert.ok(sets.every((set) => set.w === '' && set.r === '' && set.c === false));
});

test('non-openGym JSON is rejected', () => {
  assert.equal(isOpenGymPlan({ plan: {} }), false);
  assert.throws(() => parseOpenGymPlan('not json'), /valid JSON/);
  assert.throws(() => parseOpenGymPlan(JSON.stringify({ plan: {} })), /not an openGym plan/);
});
