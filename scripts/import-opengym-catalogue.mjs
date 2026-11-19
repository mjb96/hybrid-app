#!/usr/bin/env node
// =============================================================================
// OPEN GYM CATALOGUE TEXT IMPORT
//
// Reads the openGym catalogue text and emits `js/exercises/opengym-catalogue.js`.
//
// Licensing:
//   • openGym-authored catalogue text is AGPL-3.0, the same licence as openHybrid.
//   • Entries marked `textSource: "exercisedb"` keep metadata that openGym
//     received from ExerciseDB v1 via hasaneyldrm/exercises-dataset under the MIT
//     licence. Only names/ids/classification are kept; see NOTICE.md.
//   • No instructional text, descriptions or exercise media are imported.
//     openGym's media is licensed to Gym visual and is not AGPL.
//
// Usage:
//   node scripts/import-opengym-catalogue.mjs --source /path/to/openGym/catalogue/exercises
// =============================================================================
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_EXERCISES, normaliseExerciseName } from '../js/exercises/catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.indexOf('--source');
const sourceDir = arg >= 0 ? process.argv[arg + 1] : '';
if (!sourceDir) {
  console.error('Missing --source /path/to/openGym/catalogue/exercises');
  process.exit(2);
}

const EQUIPMENT = {
  'body weight': 'bodyweight', weighted: 'bodyweight', assisted: 'machine',
  dumbbell: 'dumbbells', cable: 'cables', barbell: 'barbell', 'olympic barbell': 'barbell',
  'ez barbell': 'ezBar', 'trap bar': 'barbell', band: 'bands', 'resistance band': 'bands',
  kettlebell: 'kettlebells', 'leverage machine': 'machine', 'smith machine': 'machine',
  'sled machine': 'sled', sandbag: 'sandbag', 'elliptical machine': 'erg',
  'stationary bike': 'erg', landmine: 'barbell', 'suspension trainer': 'other',
  'weight plate': 'other', 'medicine ball': 'other', 'stability ball': 'other',
  'bosu ball': 'other', 'massage ball': 'other', roller: 'other', rope: 'other',
  'wheel roller': 'other', macebell: 'other', tire: 'other',
};

const MUSCLE = {
  pectorals: 'chest', chest: 'chest', 'upper chest': 'upper_chest', lats: 'lats',
  'upper back': 'upper_back', rhomboids: 'upper_back', traps: 'traps',
  trapezius: 'traps', 'levator scapulae': 'traps', spine: 'erectors',
  'lower back': 'erectors', quadriceps: 'quads', quads: 'quads',
  hamstrings: 'hamstrings', glutes: 'glutes', abductors: 'glutes',
  adductors: 'adductors', calves: 'calves', shins: 'calves', ankles: 'calves',
  'front delts': 'front_delts', 'side delts': 'side_delts', 'rear delts': 'rear_delts',
  biceps: 'biceps', triceps: 'triceps', brachialis: 'brachialis',
  forearms: 'forearms', 'grip muscles': 'forearms', abs: 'core',
  obliques: 'core', 'lower abs': 'core', core: 'core', 'hip flexors': 'core',
  'serratus anterior': 'core',
};

const BODY_PART = {
  'upper legs': 'quads', waist: 'core', back: 'upper_back', shoulders: 'front_delts',
  chest: 'chest', 'upper arms': 'biceps', 'lower legs': 'calves',
  'lower arms': 'forearms', 'full body': 'core',
};

const SMALL = new Set(['and', 'with', 'of', 'on', 'to', 'for', 'the', 'a', 'an', 'in', 'at', 'by']);
const norm = (s) => normaliseExerciseName(String(s || '').replace(/\(([^)]*)\)/g, ' — $1'));

function titleCase(name) {
  const expanded = String(name).trim().replace(/\(([^)]*)\)/g, ' — $1');
  return expanded.split(/\s+/)
    .map((word, index) => (SMALL.has(word) && index ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
    .replace(/\bEz\b/g, 'EZ')
    .replace(/\bDb\b/g, 'DB')
    .replace(/\bPvc\b/g, 'PVC')
    .replace(/\bT Bar\b/g, 'T-Bar')
    .replace(/\bV Bar\b/g, 'V-Bar');
}

function movementFor(name, target, bodyPart, category) {
  const s = name.toLowerCase();
  if (/squat|hack|leg press/.test(s)) return 'squat';
  if (/deadlift|romanian|rdl|good morning|hip thrust|glute bridge|hinge|swing/.test(s)) return 'hinge';
  if (/lunge|split squat|step.?up|pistol/.test(s)) return 'lunge';
  if (/bench press|chest press|push.?up|dip\b|fly\b|flye/.test(s)) return 'horizontal_push';
  if (/overhead press|shoulder press|military press|arnold|pike push|handstand/.test(s)) return 'vertical_push';
  if (/row\b|row machine/.test(s)) return 'horizontal_pull';
  if (/pulldown|pull.?up|chin.?up|lat pull/.test(s)) return 'vertical_pull';
  if (/lateral raise|front raise|rear delt|reverse fly|face pull|shrug/.test(s)) return 'shoulder_isolation';
  if (/curl\b/.test(s) && !/leg curl/.test(s)) return 'elbow_flexion';
  if (/triceps|pushdown|skull|extension/.test(s) && !/leg extension/.test(s)) return 'elbow_extension';
  if (/leg extension/.test(s)) return 'knee_extension';
  if (/leg curl|nordic/.test(s)) return 'knee_flexion';
  if (/calf raise|calve raise/.test(s)) return 'calf_raise';
  if (/carry|farmer/.test(s)) return 'carry';
  if (/plank|crunch|sit.?up|dead bug|hollow|oblique/.test(s)) return 'core';
  if (['cardio', 'plyometrics', 'combat'].includes(category)) return 'conditioning';
  if (['stretching', 'mobility', 'yoga', 'pilates', 'rehab'].includes(category)) return 'mobility';
  const t = String(target || '').toLowerCase();
  if (/chest|pect|delt|tricep/.test(t)) return 'horizontal_push';
  if (/lat|back|bicep|trap/.test(t)) return 'horizontal_pull';
  if (/quad|glute|ham|calv|leg/.test(t)) return 'squat';
  return 'core';
}

function categoryFor(target, bodyPart, category) {
  const t = String(target || '').toLowerCase();
  if (['cardio', 'stretching', 'mobility', 'yoga', 'pilates', 'rehab', 'combat'].includes(category)) return 'conditioning';
  if (/chest|pect|delt|tricep/.test(t)) return 'push';
  if (/lat|back|bicep|trap|rhomboid/.test(t)) return 'pull';
  if (/quad|glute|ham|calv|adduct|abduct|leg/.test(t)) return 'legs';
  if (/abs|oblique|core|hip flexor|serratus/.test(t)) return 'core';
  if (bodyPart === 'upper legs' || bodyPart === 'lower legs') return 'legs';
  if (bodyPart === 'chest' || bodyPart === 'shoulders' || bodyPart === 'upper arms') return 'push';
  if (bodyPart === 'back') return 'pull';
  return 'conditioning';
}

const imported = [];
const entryByKey = new Map();
const coreKeys = new Set();
for (const item of CORE_EXERCISES) {
  for (const value of [item.name, ...(item.aliases || [])]) coreKeys.add(norm(value));
}

/** @type {Map<string,string>} */
const usedKeys = new Map();
for (const item of CORE_EXERCISES) {
  for (const value of [item.name, ...(item.aliases || [])]) usedKeys.set(norm(value), item.id);
}

const stats = { total: 0, imported: 0, duplicateCore: 0, duplicateImport: 0, missing: 0, noMuscle: 0, bySource: { opengym: 0, exercisedb: 0 } };
const records = [];
for (const file of readdirSync(sourceDir).filter((name) => name.endsWith('.json'))) {
  stats.total++;
  let record;
  try {
    record = JSON.parse(readFileSync(path.join(sourceDir, file), 'utf8'));
  } catch {
    stats.missing++;
    continue;
  }
  const source = record.textSource === 'exercisedb' ? 'exercisedb' : record.textSource === 'opengym' ? 'opengym' : null;
  if (!source || !Array.isArray(record.instructions) || !record.instructions.length || !record.name) {
    stats.missing++;
    continue;
  }
  records.push(record);
}

// Prefer openGym-authored records when two source rows share a display name,
// but keep every source id in the id→name map so shared plans can resolve them.
records.sort((a, b) => {
  const sourceRank = (record) => record.textSource === 'opengym' ? 0 : 1;
  return sourceRank(a) - sourceRank(b) || String(a.id).localeCompare(String(b.id));
});

/** @type {Record<string,string>} */
const idNames = {};
for (const record of records) {
  const source = record.textSource === 'exercisedb' ? 'exercisedb' : 'opengym';
  const name = titleCase(record.name);
  const key = norm(name);
  const sourceId = String(record.id);
  idNames[sourceId] = name;
  if (coreKeys.has(key)) { stats.duplicateCore++; continue; }
  const existing = entryByKey.get(key);
  if (existing) {
    existing.sourceIds.push(sourceId);
    stats.duplicateImport++;
    continue;
  }

  const equipment = [];
  for (const part of String(record.equipment || '').split(/[,;]/)) {
    const mapped = EQUIPMENT[part.trim().toLowerCase()];
    if (mapped && !equipment.includes(mapped)) equipment.push(mapped);
  }
  if (!equipment.length) equipment.push('other');
  if (/pull.?up|chin.?up/.test(name) && !equipment.includes('pullupBar')) equipment.push('pullupBar');
  if (/bench press|bench dip|bench fly/.test(name) && !equipment.includes('bench')) equipment.push('bench');

  const muscles = {};
  const primary = MUSCLE[String(record.target || '').toLowerCase()];
  if (primary) muscles[primary] = 1;
  for (const raw of record.secondaryMuscles || []) {
    const id = MUSCLE[String(raw || '').toLowerCase()];
    if (id && muscles[id] == null) muscles[id] = 0.25;
  }
  if (!Object.keys(muscles).length) {
    const fallback = BODY_PART[record.bodyPart];
    if (fallback) muscles[fallback] = 1;
    else { stats.noMuscle++; continue; }
  }

  const movement = movementFor(name, record.target, record.bodyPart, record.category);
  const category = categoryFor(record.target, record.bodyPart, record.category);
  const bodyweight = equipment.includes('bodyweight') || /push.?up|pull.?up|chin.?up|dip\b|plank|bodyweight/.test(name);
  const compound = ['squat', 'hinge', 'lunge', 'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull'].includes(movement);
  const unilateral = /one.?arm|single.?arm|one.?leg|single.?leg|split squat|lunge|step.?up|bulgarian|pistol/.test(name);
  const volumeEligible = ['strength', 'calisthenics', 'olympic', 'plyometrics'].includes(record.category)
    || (record.category === 'isometric' && compound);

  const id = `og_${sourceId}`;
  const aliases = [];
  const original = String(record.name).replace(/\(([^)]*)\)/g, ' — $1');
  const aliasKey = norm(original);
  if (aliasKey && aliasKey !== key && (!usedKeys.has(aliasKey) || usedKeys.get(aliasKey) === id)) {
    aliases.push(original);
    usedKeys.set(aliasKey, id);
  }
  if (volumeEligible && !Object.values(muscles).some((value) => value === 1)) {
    const first = Object.keys(muscles)[0];
    if (first) muscles[first] = 1;
  }
  usedKeys.set(key, id);
  const entry = {
    id,
    name,
    aliases,
    movement,
    equipment,
    category,
    muscles,
    compound,
    unilateral,
    bodyweight,
    volumeEligible,
    // Metadata only. The imported instructional text is unreviewed and is not
    // shipped; only the reviewed core catalogue carries form guidance.
    instructions: [],
    description: '',
    difficulty: null,
    safetyNotes: [],
    sourceId,
    sourceIds: [sourceId],
    textSource: source,
  };
  entryByKey.set(key, entry);
  imported.push(entry);
  stats.bySource[source]++;
  stats.imported++;
}

const output = `// GENERATED by scripts/import-opengym-catalogue.mjs — do not edit by hand.
// Exercise catalogue metadata derived from openGym (https://github.com/DuarteSantos8/openGym),
// AGPL-3.0, including ExerciseDB v1 metadata openGym distributes under MIT (see NOTICE.md).
// Instructional text and descriptions are not included. No exercise media is included.
export const OPENGYM_ID_NAMES = Object.freeze(${JSON.stringify(idNames)});
export const OPENGYM_EXERCISES = Object.freeze(${JSON.stringify(imported)});
`;

const target = path.join(ROOT, 'js', 'exercises', 'opengym-catalogue.js');
writeFileSync(target, output);
console.log(stats);
console.log(`Wrote ${path.relative(ROOT, target)} — ${imported.length} exercises, ${(Buffer.byteLength(output) / 1024 / 1024).toFixed(2)} MB`);
