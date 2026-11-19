// =============================================================================
// WARM-UP RAMP TESTS
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWarmupRamp, addWarmupRamp } from '../js/workout/warmup-ramp.js';

test('builds an ascending editable ramp below the working weight', () => {
  const rows = buildWarmupRamp(100, { bar: 20, unit: 'kg' });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.r), [5, 3, 2]);
  assert.ok(rows.every((row) => row.type === 'W' && row.ramp === true && row.c === false));
  assert.ok(rows[0].w > 20 && rows[0].w < rows[1].w && rows[1].w < rows[2].w && rows[2].w < 100);
});

test('does nothing at or below the bar, or with no working weight', () => {
  assert.deepEqual(buildWarmupRamp(20, { bar: 20 }), []);
  assert.deepEqual(buildWarmupRamp(10, { bar: 20 }), []);
  assert.deepEqual(buildWarmupRamp('', { bar: 20 }), []);
});

test('respects the profile plate inventory', () => {
  const rows = buildWarmupRamp(100, {
    bar: 20, plates: [25, 20, 10, 5], counts: { 25: 0, 20: 1, 10: 1, 5: 1 }, unit: 'kg',
  });
  assert.ok(rows.every((row) => row.w < 100));
  assert.ok(rows.every((row) => row.w > 20));
});

test('addWarmupRamp inserts once and never resurrects a deleted ramp', () => {
  const week = { lifts: { mon: { Squat: [{ w: '', r: '', c: false }] } }, liftMeta: {} };
  assert.equal(addWarmupRamp(week, 'mon', 'Squat', 100, { bar: 20 }), true);
  assert.equal(week.lifts.mon.Squat.length, 4);
  assert.equal(week.lifts.mon.Squat[0].type, 'W');
  assert.equal(addWarmupRamp(week, 'mon', 'Squat', 110, { bar: 20 }), false);

  const existing = { lifts: { mon: { Squat: [{ w: '', r: '', c: false, type: 'W' }, { w: '', r: '', c: false }] } }, liftMeta: {} };
  assert.equal(addWarmupRamp(existing, 'mon', 'Squat', 100, { bar: 20 }), false);
});
