// =============================================================================
// WARM-UP RAMP TESTS
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWarmupRamp, addWarmupRamp, rampSetsFor, RAMP_SETS, ISOLATION_RAMP_SETS,
} from '../js/workout/warmup-ramp.js';

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

test('compound lifts keep the three-rung ladder; isolation gets two', () => {
  assert.equal(rampSetsFor({ compound: true }), RAMP_SETS);
  assert.equal(rampSetsFor({ compound: false }), ISOLATION_RAMP_SETS);
  assert.equal(rampSetsFor(null), ISOLATION_RAMP_SETS);
  assert.deepEqual(ISOLATION_RAMP_SETS.map((r) => r.reps), [5, 3]);
  assert.ok(ISOLATION_RAMP_SETS[0].pct > RAMP_SETS[0].pct);
});

test('dumbbell rungs snap DOWN to the owned ladder', () => {
  const ladder = [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40];
  const rows = buildWarmupRamp(40, { dumbbells: ladder, basis: 'each', unit: 'kg' });
  // 40% → 16 snaps to 15; 60% → 24 snaps to 22.5; 80% → 32 snaps to 30.
  assert.deepEqual(rows.map((row) => row.w), [15, 22.5, 30]);
  assert.ok(rows.every((row) => row.w < 40 && row.type === 'W'));
});

test('a Both-basis dumbbell ramp works in pair space', () => {
  const ladder = [2.5, 5, 10, 15, 20, 22.5, 25, 30, 32.5, 35, 40];
  // 80 kg total = 40 kg per hand.
  const rows = buildWarmupRamp(80, { dumbbells: ladder, basis: 'total', unit: 'kg' });
  // 80% → 32 per hand, which the ladder does not own, so it snaps down to 30.
  assert.deepEqual(rows.map((row) => row.w), [30, 45, 60]);
  assert.ok(rows.every((row) => row.w < 80));
});

test('an unconfigured dumbbell ladder produces no ramp at all', () => {
  assert.deepEqual(buildWarmupRamp(40, { dumbbells: [], basis: 'each' }), []);
  assert.deepEqual(buildWarmupRamp(40, { dumbbells: [0, -5, Number.NaN] }), []);
});

test('isolation rungs flow through the barbell ramp', () => {
  const compound = buildWarmupRamp(100, { bar: 20, unit: 'kg', rungs: rampSetsFor({ compound: true }) });
  const isolation = buildWarmupRamp(100, { bar: 20, unit: 'kg', rungs: rampSetsFor({ compound: false }) });
  assert.equal(compound.length, 3);
  assert.equal(isolation.length, 2);
  assert.ok(isolation[0].w > compound[0].w);   // 50% starts higher than 40%
  assert.ok(isolation[1].w < 100);
});

test('addWarmupRamp inserts dumbbell rungs once and never stamps a failed ramp', () => {
  const week = { lifts: { mon: { 'Dumbbell Bench Press': [{ w: '', r: '', c: false }] } }, liftMeta: {} };
  const setup = {
    dumbbells: [10, 15, 20, 22.5, 30, 35, 40], basis: 'each', unit: 'kg',
    rungs: rampSetsFor({ compound: true }),
  };
  assert.equal(addWarmupRamp(week, 'mon', 'Dumbbell Bench Press', 40, setup), true);
  const rows = week.lifts.mon['Dumbbell Bench Press'];
  assert.deepEqual(rows.map((row) => row.w), [15, 22.5, 30, '']);
  assert.ok(rows.slice(0, 3).every((row) => row.type === 'W' && row.ramp === true));
  // The stamp is what stops a deleted rung from resurrecting.
  assert.equal(week.liftMeta.mon['Dumbbell Bench Press'].autoRamp, true);
  assert.equal(addWarmupRamp(week, 'mon', 'Dumbbell Bench Press', 42.5, setup), false);

  // No ladder configured: no rows AND no stamp, so configuring one later works.
  const bare = { lifts: { mon: { 'Dumbbell Bench Press': [{ w: '', r: '', c: false }] } }, liftMeta: {} };
  assert.equal(addWarmupRamp(bare, 'mon', 'Dumbbell Bench Press', 40, { dumbbells: [], unit: 'kg' }), false);
  assert.equal(bare.liftMeta.mon, undefined);
});
