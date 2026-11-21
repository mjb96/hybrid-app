// =============================================================================
// BODY MEASUREMENTS TESTS
// Canonical centimetres, optional sites, one record per date. A unit change must
// never rewrite stored data — only how it is read.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MEASUREMENT_SITES, measurementUnit, cmToDisplay, displayToCm, measurementCm,
  normalizeMeasurements, measurementSiteTrends, buildMeasurementRecord,
  buildMeasurementModel, MIN_MEASUREMENT_CM, MAX_MEASUREMENT_CM,
} from '../js/metrics/measurements.js';
import { buildMeasurementsCsv } from '../js/portability/csv-export.js';

test('the tracked sites are a stable, labelled set', () => {
  assert.deepEqual(MEASUREMENT_SITES.map((site) => site.key), ['waist', 'chest', 'hips', 'arm', 'thigh', 'neck']);
  assert.ok(MEASUREMENT_SITES.every((site) => site.label.length > 0));
});

test('the display unit follows the weight unit until it is chosen explicitly', () => {
  assert.equal(measurementUnit({ settings: { weightUnit: 'kg' } }), 'cm');
  assert.equal(measurementUnit({ settings: { weightUnit: 'lbs' } }), 'in');
  assert.equal(measurementUnit({ settings: { weightUnit: 'lbs', measurementUnit: 'cm' } }), 'cm');
  assert.equal(measurementUnit({ settings: {} }), 'cm');
  assert.equal(measurementUnit(null), 'cm');
});

test('centimetres and inches convert without losing the stored value', () => {
  assert.equal(cmToDisplay(86.4, 'cm'), 86.4);
  assert.equal(cmToDisplay(86.4, 'in'), 86.4 / 2.54);
  assert.equal(Math.round(displayToCm(34, 'in') * 100) / 100, 86.36);
  assert.equal(displayToCm(86.4, 'cm'), 86.4);
});

test('a blank or implausible reading is not a measurement', () => {
  assert.equal(measurementCm('', 'cm'), null);
  assert.equal(measurementCm('   ', 'cm'), null);
  assert.equal(measurementCm('abc', 'cm'), null);
  assert.equal(measurementCm(MIN_MEASUREMENT_CM - 0.1, 'cm'), null);
  assert.equal(measurementCm(MAX_MEASUREMENT_CM + 0.1, 'cm'), null);
  assert.equal(measurementCm(84.04, 'cm'), 84);
  assert.equal(measurementCm(84.06, 'cm'), 84.1);
});

test('normalize keeps valid, optional sites and one reading per date', () => {
  const rows = normalizeMeasurements([
    { date: '2026-11-10', waist: 84, chest: 102, neck: 0 },
    { date: '2026-11-10', waist: 83.5 },                 // same date wins
    { date: 'not-a-date', waist: 80 },
    { date: '2026-11-03', waist: 85.2, unmeasured: 1 },
    { date: '2026-11-17', arm: '' },                     // nothing measured
  ]);
  assert.deepEqual(rows, [
    { date: '2026-11-03', waist: 85.2 },
    { date: '2026-11-10', waist: 83.5 },
  ]);
});

test('site trends report the change since that site was last measured', () => {
  const trends = measurementSiteTrends([
    { date: '2026-10-01', waist: 90, chest: 100 },
    { date: '2026-10-15', waist: 88 },
    { date: '2026-11-01', waist: 86.5, chest: 102 },
  ]);
  const waist = trends.find((site) => site.key === 'waist');
  const chest = trends.find((site) => site.key === 'chest');
  const neck = trends.find((site) => site.key === 'neck');
  assert.equal(waist.latest.cm, 86.5);
  assert.equal(waist.latest.date, '2026-11-01');
  assert.equal(Math.round(waist.delta * 10) / 10, -1.5);   // vs 88, not vs 90
  assert.equal(Math.round(waist.total * 10) / 10, -3.5);   // vs the first reading
  assert.equal(chest.delta, 2);
  assert.equal(chest.points.length, 2);
  assert.equal(neck.latest, null);
  assert.equal(neck.delta, null);
});

test('a record converts inches to canonical centimetres and flags bad fields', () => {
  const { record, invalid } = buildMeasurementRecord('2026-11-21', {
    waist: '34', chest: '', arm: '999',
  }, 'in');
  assert.equal(record.date, '2026-11-21');
  assert.equal(record.waist, 86.4);
  assert.equal(record.chest, undefined);
  assert.equal(record.arm, undefined);
  assert.deepEqual(invalid, ['Arm']);
});

test('the model reports the latest date, recency order and only measured sites', () => {
  const model = buildMeasurementModel({
    settings: { weightUnit: 'kg' },
    bodyMeasurements: [
      { date: '2026-11-01', waist: 86.5 },
      { date: '2026-11-15', waist: 85.9, hips: 98 },
      { date: '2026-11-20', chest: 104 },
    ],
  }, { recentCount: 2 });
  assert.equal(model.unit, 'cm');
  assert.equal(model.count, 3);
  assert.equal(model.latestDate, '2026-11-20');
  assert.deepEqual(model.recent.map((entry) => entry.date), ['2026-11-20', '2026-11-15']);
  assert.deepEqual(model.tracked.map((site) => site.key), ['waist', 'chest', 'hips']);
  assert.equal(model.sites.find((site) => site.key === 'thigh').latest, null);
});

test('an empty log yields an empty model rather than placeholders', () => {
  const model = buildMeasurementModel({});
  assert.equal(model.unit, 'cm');
  assert.equal(model.count, 0);
  assert.equal(model.latestDate, null);
  assert.deepEqual(model.tracked, []);
  assert.deepEqual(model.recent, []);
});

test('the measurements CSV keeps canonical centimetres and blank sites', () => {
  const csv = buildMeasurementsCsv({ bodyMeasurements: [
    { date: '2026-11-01', waist: 86.5, chest: 104 },
    { date: '2026-11-15', waist: 85.9 },
  ] });
  const lines = csv.trim().split(/\r\n/);
  assert.equal(lines[0], '"Date","Waist (cm)","Chest (cm)","Hips (cm)","Arm (cm)","Thigh (cm)","Neck (cm)"');
  assert.equal(lines[1], '"2026-11-01","86.5","104","","","",""');
  assert.equal(lines[2], '"2026-11-15","85.9","","","","",""');
});
