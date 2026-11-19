// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeBodyCsv,
  parseBodyCsv,
  applyBodyweightCsvImport,
} from '../js/portability/import-body-csv.js';

const bodyCsv = `date,weight_kg,waist_cm
2026-10-13 06:34,88.2,
2026-10-14 06:13,87.2,
2026-10-14 07:00,87.0,
2026-11-19 06:09,83.5,
`;

test('detects the body export without mistaking a workout CSV', () => {
  assert.equal(looksLikeBodyCsv(bodyCsv), true);
  assert.equal(looksLikeBodyCsv('date,exercise,weight,reps\n2026-11-02,Bench,100,5\n'), false);
  assert.equal(looksLikeBodyCsv('date,note\n2026-11-02,hello\n'), false);
});

test('parses dates, keeps the last reading per day and skips bad rows', () => {
  const parsed = parseBodyCsv(bodyCsv, { unit: 'kg' });
  assert.deepEqual(parsed.entries, [
    { date: '2026-10-13', weight: 88.2 },
    { date: '2026-10-14', weight: 87 },
    { date: '2026-11-19', weight: 83.5 },
  ]);
  assert.equal(parsed.duplicates, 1);
});

test('converts pounds into the profile unit', () => {
  const parsed = parseBodyCsv('date,weight_lb\n2026-11-19,183.2\n', { unit: 'kg' });
  assert.equal(parsed.entries[0].weight, 83.1);
});

test('merges without overwriting an existing date', () => {
  const parsed = parseBodyCsv(bodyCsv, { unit: 'kg' });
  const state = { bodyWeightLog: [{ date: '2026-10-14', weight: 86 }], settings: {} };
  const result = applyBodyweightCsvImport(state, parsed);
  assert.deepEqual(result, { added: 2, skipped: 1 });
  assert.deepEqual(state.bodyWeightLog.map((e) => e.date), ['2026-10-13', '2026-10-14', '2026-11-19']);
  assert.equal(state.bodyWeightLog[1].weight, 86);
  assert.equal(state.settings.defaultBodyWeight, 83.5);
});

test('rejects a workout CSV as a body export', () => {
  assert.throws(() => parseBodyCsv('date,exercise,weight,reps\n2026-11-02,Bench,100,5\n', { unit: 'kg' }));
});
