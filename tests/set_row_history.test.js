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
});
