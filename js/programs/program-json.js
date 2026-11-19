// @ts-check
// =============================================================================
// PLAN JSON (js/programs/program-json.js)
//
// A portable, human-readable plan file: openHybrid can export any program and
// import it on another device. Only plan content is included — no history,
// health data, account data or executable content. Imported plans become normal
// custom programs and never overwrite a catalog/shared program.
// =============================================================================

import { secureRandomSuffix } from '../util/secure-id.js';

export const PLAN_FILE_FORMAT = 'openhybrid-plan';
export const PLAN_FILE_VERSION = 1;

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const str = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const strings = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []);

function normalizeDays(days) {
  const out = {};
  for (const day of DAY_KEYS) {
    const source = days?.[day] && typeof days[day] === 'object' ? days[day] : {};
    out[day] = {
      title: str(source.title, 'Rest'),
      badge: str(source.badge, source.title === 'Rest' ? 'Rest' : 'Training'),
      color: str(source.color, 'var(--text-muted)'),
      desc: str(source.desc),
      runs: str(source.runs, 'Rest'),
      lifts: strings(source.lifts),
    };
  }
  return out;
}

function normalizeWeeks(source, totalWeeks) {
  const out = {};
  for (let week = 1; week <= totalWeeks; week++) {
    const mod = source?.[week] ?? source?.[String(week)] ?? {};
    out[String(week)] = {
      sets: mod?.sets ?? 3,
      reps: mod?.reps ?? 10,
      intensityLabel: str(mod?.intensityLabel),
      ...(mod?.deload ? { deload: true } : {}),
    };
  }
  return out;
}

function planContent(plan) {
  const totalWeeks = Math.max(1, Math.min(104, parseInt(String(plan?.totalWeeks), 10) || 12));
  const name = str(plan?.name).trim();
  if (!name) throw new Error('The plan has no name.');
  const sourceDays = plan?.days && typeof plan.days === 'object' ? plan.days : null;
  if (!sourceDays) throw new Error('The plan has no days.');
  const days = normalizeDays(sourceDays);
  const hasTraining = DAY_KEYS.some((day) => days[day].lifts.length || (days[day].runs && !/^rest$/i.test(days[day].runs)));
  if (!hasTraining) throw new Error('The plan has no training days.');
  return {
    name,
    totalWeeks,
    tagline: str(plan?.tagline),
    description: str(plan?.description),
    category: str(plan?.category, 'custom'),
    difficulty: str(plan?.difficulty, 'intermediate'),
    equipment: strings(plan?.equipment),
    goals: strings(plan?.goals),
    days,
    weeklyVolModifiers: normalizeWeeks(plan?.weeklyVolModifiers, totalWeeks),
    progressionStyle: str(plan?.progressionStyle, 'double'),
    progressionModel: str(plan?.progressionModel),
    dossier: {
      creator: str(plan?.dossier?.creator, 'Imported'),
      focus: str(plan?.dossier?.focus, 'Imported plan'),
      philosophy: str(plan?.dossier?.philosophy, 'A plan imported into openHybrid.'),
    },
  };
}

/** Build the portable file for one resolved program. */
export function buildPlanFile(program) {
  return {
    format: PLAN_FILE_FORMAT,
    version: PLAN_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    plan: planContent(program),
  };
}

/** Parse a .json plan file (or a bare exported plan object). */
export function parsePlanFile(text) {
  let parsed;
  try { parsed = JSON.parse(String(text || '')); }
  catch { throw new Error('That file is not valid JSON.'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('That file is not a plan.');
  if (parsed.format && parsed.format !== PLAN_FILE_FORMAT) throw new Error('That JSON is not an openHybrid plan.');
  const plan = parsed.plan && typeof parsed.plan === 'object' ? parsed.plan : parsed;
  return planContent(plan);
}

/** Turn a parsed plan into a new editable custom program. */
export function createImportedProgram(plan, existingIds = []) {
  const ids = new Set(existingIds);
  let id;
  do {
    id = `prog_import_${Date.now().toString(36)}_${secureRandomSuffix(8)}`;
  } while (ids.has(id));
  return {
    ...plan,
    id,
    isPrimaryCustomization: false,
    sourceProgramId: null,
    importedAt: new Date().toISOString(),
  };
}

export function planFilename(program) {
  const safe = String(program?.name || 'openhybrid-plan')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'openhybrid-plan';
  return `${safe}.json`;
}
