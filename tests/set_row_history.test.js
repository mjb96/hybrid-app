import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSetRow } from '../js/templates.js';

test('a first-ever row may show a ghost target but never claims it as history', () => {
  const html = buildSetRow(
    { w: '', r: '', c: false }, 0, 'Back Squat', { w: 90, r: 10 },
    'kg', 'Back Squat', 80, 10,
  );
  assert.match(html, /placeholder="90"/);
  assert.doesNotMatch(html, /set-prev/);
  assert.doesNotMatch(html, /Last 90/);
});

test('a real previous set still renders the persistent Last line', () => {
  const html = buildSetRow(
    { w: '', r: '', c: false }, 0, 'Back Squat', { w: 90, r: 10 },
    'kg', 'Back Squat', 80, 10, 10, { w: 85, r: 8 },
  );
  assert.match(html, /set-prev/);
  assert.match(html, /Last 85kg × 8/);
  assert.doesNotMatch(html, /set-cmp/, 'an unfinished set has no comparison result');
});

test('dumbbell rows expose the Each / Both basis; barbell rows do not', () => {
  const dumbbell = buildSetRow(
    { w: '', r: '', c: false }, 0, 'Dumbbell Bench Press', null,
    'kg', 'Dumbbell Bench Press', 80, 8,
  );
  assert.match(dumbbell, /data-load-basis="each"/);
  assert.match(dumbbell, /data-action="toggle-load-basis"/);

  const barbell = buildSetRow(
    { w: '', r: '', c: false }, 0, 'Barbell Bench Press', null,
    'kg', 'Barbell Bench Press', 80, 8,
  );
  assert.doesNotMatch(barbell, /toggle-load-basis/);
});

test('per-set rest and note controls render their stored values', () => {
  const html = buildSetRow(
    { w: '90', r: '8', c: true, restSec: 90, note: 'Paused at the bottom' }, 0, 'Back Squat', null,
    'kg', 'Back Squat', 80, 8,
  );
  assert.match(html, /Rest 1:30/);
  assert.match(html, /edit-set-rest/);
  assert.match(html, /Note ✓/);
  assert.match(html, /Paused at the bottom/);
  assert.match(html, /set-note/);
});

test('failure is an independent set flag, not the AMRAP type', () => {
  const html = buildSetRow(
    { w: '90', r: '8', c: true, failure: true }, 0, 'Back Squat', null,
    'kg', 'Back Squat', 80, 8, 8, { w: 85, r: 8 },
  );
  assert.match(html, /data-action="toggle-set-failure"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /btn-failure tactile-scale is-failure/);
  assert.doesNotMatch(html, /type-amrap/, 'failure does not silently become AMRAP');
});

test('a completed set compares against the same set last session', () => {
  const up = buildSetRow(
    { w: '90', r: '8', c: true }, 0, 'Back Squat', { w: 90, r: 10 },
    'kg', 'Back Squat', 80, 10, 10, { w: 85, r: 8 },
  );
  assert.match(up, /set-cmp--up/);
  assert.match(up, /data-prev-w="85"/);

  const same = buildSetRow(
    { w: '85', r: '8', c: true }, 0, 'Back Squat', { w: 90, r: 10 },
    'kg', 'Back Squat', 80, 10, 10, { w: 85, r: 8 },
  );
  assert.match(same, /set-cmp--same/);
});
