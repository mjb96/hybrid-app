// =============================================================================
// THEME PALETTE CONTRACT
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES, DEFAULT_PALETTE, normalizePalette, applyPalette } from '../js/theme.js';

test('Midnight is the default and unknown values fall back to it', () => {
  assert.equal(DEFAULT_PALETTE, 'midnight');
  assert.equal(PALETTES[0].id, 'midnight');
  assert.equal(normalizePalette('forest'), 'forest');
  assert.equal(normalizePalette('not-a-palette'), 'midnight');
  assert.equal(normalizePalette(null), 'midnight');
});

test('applyPalette writes the id without touching the theme mode', () => {
  const root = { dataset: { theme: 'dark' } };
  assert.equal(applyPalette(root, 'ember'), 'ember');
  assert.deepEqual(root.dataset, { theme: 'dark', palette: 'ember' });
});
