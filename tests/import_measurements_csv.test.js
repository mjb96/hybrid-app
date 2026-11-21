// =============================================================================
// MEASUREMENTS CSV IMPORT TESTS
// Round-trips our own export, converts inch columns, merges same-date rows and
// never overwrites an existing date.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeMeasurementsCsv, parseMeasurementsCsv, applyMeasurementsCsvImport,
} from '../js/portability/import-measurements-csv.js';
import { buildMeasurementsCsv } from '../js/portability/csv-export.js';

test('detects a measurements CSV and leaves other exports alone', () => {
  assert.equal(looksLikeMeasurementsCsv('date,waist_cm,chest_cm\n2026-11-01,86,104'), true);
  assert.equal(looksLikeMeasurementsCsv('date,waist,neck\n2026-11-01,86,38'), true);
  assert.equal(looksLikeMeasurementsCsv('Date,Weight\n2026-11-01,85'), false);
  assert.equal(looksLikeMeasurementsCsv('date,weight_kg,waist_cm\n2026-11-01,85,86'), false);
  assert.equal(looksLikeMeasurementsCsv('date,exercise,set,weight\n2026-11-01,Squat,1,100'), false);
  assert.equal(looksLikeMeasurementsCsv('date,notes\n2026-11-01,hello'), false);
});

test('round-trips the CSV that Settings → Data writes', () => {
  const state = { bodyMeasurements: [
    { date: '2026-11-01', waist: 86.5, chest: 104 },
    { date: '2026-11-15', waist: 85.9 },
  ] };
  const parsed = parseMeasurementsCsv(buildMeasurementsCsv(state));
  assert.deepEqual(parsed.entries, [
    { date: '2026-11-01', waist: 86.5, chest: 104 },
    { date: '2026-11-15', waist: 85.9 },
  ]);
  assert.equal(parsed.skipped, 0);
});

test('inch columns and bare headers convert to canonical centimetres', () => {
  const inches = parseMeasurementsCsv('date,waist_in,arm_in\n2026-11-01,34,14');
  assert.equal(inches.entries[0].waist, 86.4);   // 34 × 2.54
  assert.equal(inches.entries[0].arm, 35.6);

  const bare = parseMeasurementsCsv('date,waist\n2026-11-01,34', { unit: 'lbs' });
  assert.equal(bare.entries[0].waist, 86.4);

  const bareCm = parseMeasurementsCsv('date,waist\n2026-11-01,84', { unit: 'kg' });
  assert.equal(bareCm.entries[0].waist, 84);
});

test('rows for the same date merge site by site', () => {
  const parsed = parseMeasurementsCsv([
    'date,waist_cm,chest_cm',
    '2026-11-01,86,',
    '2026-11-01,,104',
  ].join('\n'));
  assert.deepEqual(parsed.entries, [{ date: '2026-11-01', waist: 86, chest: 104 }]);
});

test('implausible readings are skipped rather than imported', () => {
  const parsed = parseMeasurementsCsv([
    'date,waist_cm,chest_cm,arm_cm',
    '2026-11-01,0,104,999',
    '2026-11-02,84,,',
    'not-a-date,80,,',
  ].join('\n'));
  assert.deepEqual(parsed.entries, [
    { date: '2026-11-01', chest: 104 },
    { date: '2026-11-02', waist: 84 },
  ]);
  assert.equal(parsed.skipped, 1);   // the row with no usable date
});

test('a file with no valid measurements is rejected', () => {
  assert.throws(() => parseMeasurementsCsv('date,waist_cm\n2026-11-01,999'), /no valid measurements/);
  assert.throws(() => parseMeasurementsCsv('date,notes\n2026-11-01,hello'), /no measurement columns/);
});

test('applying an import adds only missing dates and keeps the log sorted', () => {
  const state = { bodyMeasurements: [{ date: '2026-11-01', waist: 86.5 }] };
  const parsed = parseMeasurementsCsv('date,waist_cm\n2026-11-03,85\n2026-11-01,80');
  const result = applyMeasurementsCsvImport(state, parsed);
  assert.deepEqual(result, { added: 1, skipped: 1 });
  assert.deepEqual(state.bodyMeasurements, [
    { date: '2026-11-01', waist: 86.5 },   // existing value untouched
    { date: '2026-11-03', waist: 85 },
  ]);
});

test('applying to a state without a log creates it', () => {
  const state = {};
  const result = applyMeasurementsCsvImport(state, parseMeasurementsCsv('date,waist_cm\n2026-11-01,85'));
  assert.deepEqual(result, { added: 1, skipped: 0 });
  assert.deepEqual(state.bodyMeasurements, [{ date: '2026-11-01', waist: 85 }]);
});
