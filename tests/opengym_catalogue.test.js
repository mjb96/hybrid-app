// =============================================================================
// openGym catalogue-text import contract
//
// The text is AGPL-3.0 like openHybrid; the exercise media is not and must never
// appear here. Only `textSource: "opengym"` rows are imported.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CORE_EXERCISES, EQUIPMENT, EXERCISE_CATEGORIES, EXERCISES, MOVEMENT_PATTERNS, MUSCLES,
  canonicalExerciseId,
} from '../js/exercises/catalog.js';
import { OPENGYM_EXERCISES } from '../js/exercises/opengym-catalogue.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the imported catalogue has the expected breadth and joins the core list', () => {
  assert.ok(OPENGYM_EXERCISES.length >= 4000, `expected 4000+, got ${OPENGYM_EXERCISES.length}`);
  assert.equal(EXERCISES.length, CORE_EXERCISES.length + OPENGYM_EXERCISES.length);
  for (const item of OPENGYM_EXERCISES) {
    assert.match(item.id, /^og_\d+$/);
    assert.ok(item.name && item.instructions.length >= 1, `${item.id} needs a name and instructions`);
    assert.ok(EXERCISE_CATEGORIES.includes(item.category), `${item.id} category`);
    assert.ok(MOVEMENT_PATTERNS.includes(item.movement), `${item.id} movement`);
    assert.ok(Array.isArray(item.safetyNotes) && item.safetyNotes.length === 0, `${item.id} is unreviewed`);
    assert.equal(item.difficulty, null, `${item.id} must not invent a difficulty`);
    assert.ok(item.equipment.length > 0);
    for (const equipment of item.equipment) assert.ok(EQUIPMENT.includes(equipment), `${item.id} equipment ${equipment}`);
    for (const [muscle, credits] of Object.entries(item.muscles)) {
      assert.ok(MUSCLES.includes(muscle), `${item.id} muscle ${muscle}`);
      assert.ok([0.25, 0.5, 1].includes(credits), `${item.id}/${muscle} credits`);
    }
    if (item.volumeEligible) assert.ok(Object.values(item.muscles).includes(1), `${item.id} needs a primary muscle`);
    assert.ok(item.sourceId, `${item.id} keeps its openGym id for provenance`);
  }
});

test('the generated file says where the text came from and excludes media', () => {
  const source = readFileSync(path.join(ROOT, 'js/exercises/opengym-catalogue.js'), 'utf8');
  assert.match(source, /openGym/);
  assert.match(source, /AGPL-3\.0/);
  assert.match(source, /No exercise media/i);
  assert.doesNotMatch(source, /\.gif|\.mp4|\.webm|exercise-media|catalogue\/media/i);
});

test('imported names resolve and keep their provenance after a CSV import', () => {
  const sample = OPENGYM_EXERCISES.find((item) => /barbell bent over wide grip row/i.test(item.name));
  assert.ok(sample, 'sample exercise is present');
  assert.equal(canonicalExerciseId(sample.name), sample.id);
  assert.equal(canonicalExerciseId(sample.name.toLowerCase()), sample.id);
});

test('no exercise from a non-openGym text source slipped in', () => {
  const source = readFileSync(path.join(ROOT, 'js/exercises/opengym-catalogue.js'), 'utf8');
  assert.doesNotMatch(source, /exercisedb/i);
});
