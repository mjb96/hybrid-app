// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanFile, parsePlanFile, createImportedProgram, planFilename } from '../js/programs/program-json.js';

const plan = {
  name: 'Test Block',
  totalWeeks: 4,
  days: {
    mon: { title: 'Push', lifts: ['Bench Press'], runs: 'Rest' },
    tue: { title: 'Rest', lifts: [], runs: 'Rest' },
    wed: { title: 'Pull', lifts: ['Barbell Row'], runs: 'Rest' },
  },
  weeklyVolModifiers: { 1: { sets: 4, reps: 6, intensityLabel: 'Build' } },
};

test('a plan round-trips through the JSON file', () => {
  const file = buildPlanFile(plan);
  assert.equal(file.format, 'openhybrid-plan');
  const parsed = parsePlanFile(JSON.stringify(file));
  assert.equal(parsed.name, 'Test Block');
  assert.equal(parsed.totalWeeks, 4);
  assert.deepEqual(parsed.days.mon.lifts, ['Bench Press']);
  assert.equal(parsed.days.tue.title, 'Rest');
  assert.equal(parsed.weeklyVolModifiers['4'].sets, 3);
  assert.equal(parsed.weeklyVolModifiers['1'].intensityLabel, 'Build');
});

test('import creates a fresh custom id and never claims a source program', () => {
  const parsed = parsePlanFile(JSON.stringify({ plan }));
  const imported = createImportedProgram(parsed, ['prog_import_fixed']);
  assert.match(imported.id, /^prog_import_/);
  assert.equal(imported.id === 'prog_import_fixed', false);
  assert.equal(imported.sourceProgramId, null);
  assert.equal(imported.days.mon.lifts[0], 'Bench Press');
});

test('bad or empty plans are rejected', () => {
  assert.throws(() => parsePlanFile('not json'), /valid JSON/);
  assert.throws(() => parsePlanFile(JSON.stringify({ format: 'something-else' })), /not an openHybrid plan/);
  assert.throws(() => parsePlanFile(JSON.stringify({ plan: { name: 'Empty', days: {} } })), /no training days/);
  assert.throws(() => parsePlanFile(JSON.stringify({ plan: { days: plan.days } })), /no name/);
});

test('a filename is safe and readable', () => {
  assert.equal(planFilename({ name: 'My Plan: 5×5!' }), 'my-plan-5-5.json');
});
