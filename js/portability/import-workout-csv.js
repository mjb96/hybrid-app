// @ts-check
// =============================================================================
// WORKOUT CSV IMPORT — clean-room reader for the public OpenGym/Strong/Hevy
// export shape. One row per set; no code or exercise media from OpenGym is
// copied. Strength sets become archived openHybrid sessions; cardio rows are counted
// and skipped in this first pass.
// =============================================================================

export const CSV_IMPORT_LIMITS = {
  maxBytes: 20 * 1024 * 1024,
  maxRows: 50000,
};

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** RFC 4180 CSV parser: quotes, doubled quotes, CRLF and a UTF-8 BOM. */
export function parseCsv(text) {
  const input = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (ch === '\r') continue;
    field += ch;
  }
  if (quoted) throw new Error('Unclosed quoted field');
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
}

const normalizeHeader = (h) => String(h || '')
  .trim()
  .toLowerCase()
  .replace(/^\ufeff/, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const ALIASES = {
  date: ['date', 'workout_date', 'day'],
  start: ['start_time', 'start', 'time', 'workout_datetime'],
  end: ['end_time', 'end'],
  workout: ['workout', 'workout_name', 'title'],
  note: ['workout_note', 'workout_notes', 'description'],
  exercise: ['exercise', 'exercise_name', 'exercise_title'],
  set: ['set', 'set_index', 'set_order'],
  setType: ['set_type', 'type'],
  weightKg: ['weight_kg'],
  weightLb: ['weight_lb', 'weight_lbs'],
  weight: ['weight'],
  unit: ['unit', 'weight_unit'],
  reps: ['reps', 'repetitions'],
  rpe: ['rpe'],
  rir: ['rir'],
  distance: ['distance_km', 'distance', 'km'],
  seconds: ['seconds', 'duration_seconds', 'time_seconds'],
  side: ['side'],
  setNote: ['note', 'set_note', 'exercise_notes'],
};

function columnIndex(headers, aliases) {
  for (const alias of aliases) {
    const i = headers.indexOf(alias);
    if (i >= 0) return i;
  }
  return -1;
}

function columnsFor(headers) {
  return {
    date: columnIndex(headers, ALIASES.date),
    start: columnIndex(headers, ALIASES.start),
    end: columnIndex(headers, ALIASES.end),
    workout: columnIndex(headers, ALIASES.workout),
    note: columnIndex(headers, ALIASES.note),
    exercise: columnIndex(headers, ALIASES.exercise),
    set: columnIndex(headers, ALIASES.set),
    setType: columnIndex(headers, ALIASES.setType),
    weightKg: columnIndex(headers, ALIASES.weightKg),
    weightLb: columnIndex(headers, ALIASES.weightLb),
    weight: columnIndex(headers, ALIASES.weight),
    unit: columnIndex(headers, ALIASES.unit),
    reps: columnIndex(headers, ALIASES.reps),
    rpe: columnIndex(headers, ALIASES.rpe),
    rir: columnIndex(headers, ALIASES.rir),
    distance: columnIndex(headers, ALIASES.distance),
    seconds: columnIndex(headers, ALIASES.seconds),
    side: columnIndex(headers, ALIASES.side),
    setNote: columnIndex(headers, ALIASES.setNote),
  };
}

const cell = (row, index) => (index >= 0 && index < row.length ? String(row[index] || '').trim() : '');
const number = (value) => {
  const n = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const round2 = (n) => Math.round(n * 100) / 100;
const isWarmup = (value) => /warm|aufw|échauff/i.test(String(value || ''));
const setType = (value) => {
  const v = String(value || '').toLowerCase();
  if (isWarmup(v)) return 'W';
  if (v.includes('drop')) return 'D';
  if (v.includes('fail') || v.includes('amrap')) return 'F';
  return '';
};

/** `YYYY-MM-DD` from a date or a date-time cell. */
function dateOf(value) {
  const m = String(value || '').match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (y < 1970 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Local timestamp for a date, or a date-time string. Null when unusable. */
function timeOf(value, date) {
  const text = String(value || '').trim();
  if (!text) return date ? new Date(`${date}T12:00:00`).getTime() : null;
  const direct = Date.parse(text);
  if (Number.isFinite(direct)) return direct;
  const m = text.match(/(\d{1,2}):(\d{2})/);
  if (!m || !date) return date ? new Date(`${date}T12:00:00`).getTime() : null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return new Date(`${date}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`).getTime();
}

function weekdayForDate(date) {
  const [y, m, d] = String(date).split('-').map(Number);
  return DAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
}

function durationText(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Parse workout rows into sessions. Returns the raw exercise names and sets;
 * `applyWorkoutCsvImport` maps them into openHybrid state.
 *
 * @param {string} text
 * @param {{ unit?: 'kg'|'lbs' }} [opts]
 */
export function parseWorkoutCsv(text, opts = {}) {
  const targetUnit = opts.unit === 'lbs' ? 'lbs' : 'kg';
  if (typeof text !== 'string') throw new Error('The file is not text.');
  if (text.length > CSV_IMPORT_LIMITS.maxBytes) throw new Error('The CSV file is too large.');
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The CSV has no workout rows.');
  if (rows.length > CSV_IMPORT_LIMITS.maxRows + 1) throw new Error('The CSV has too many rows.');

  const headers = rows[0].map(normalizeHeader);
  const columns = columnsFor(headers);
  if (columns.exercise < 0) {
    throw new Error('The CSV has no exercise column.');
  }
  if (columns.reps < 0 && columns.seconds < 0 && columns.distance < 0) {
    throw new Error('The CSV has no reps or duration column.');
  }

  const sessions = new Map();
  let skippedCardio = 0;
  let skippedInvalid = 0;
  let totalSets = 0;

  for (const row of rows.slice(1)) {
    const exercise = cell(row, columns.exercise);
    if (!exercise) { skippedInvalid++; continue; }
    const date = dateOf(cell(row, columns.date)) || dateOf(cell(row, columns.start));
    if (!date) { skippedInvalid++; continue; }

    const start = timeOf(cell(row, columns.start), date);
    const end = timeOf(cell(row, columns.end), date);
    const workout = cell(row, columns.workout) || 'Imported Workout';
    const note = cell(row, columns.note);
    const reps = number(cell(row, columns.reps));
    const distance = number(cell(row, columns.distance));
    const seconds = number(cell(row, columns.seconds));

    // Cardio is a different openHybrid record type; count it and keep going.
    if (!(reps > 0) && ((distance || 0) > 0 || (seconds || 0) > 0)) {
      skippedCardio++;
      continue;
    }
    if (!(reps > 0)) { skippedInvalid++; continue; }

    const rawWeight = columns.weightKg >= 0 ? number(cell(row, columns.weightKg))
      : columns.weightLb >= 0 ? number(cell(row, columns.weightLb))
      : columns.weight >= 0 ? number(cell(row, columns.weight))
      : null;
    const rowUnit = columns.weightKg >= 0 ? 'kg'
      : columns.weightLb >= 0 ? 'lb'
      : (cell(row, columns.unit) || targetUnit).toLowerCase();
    const unit = rowUnit === 'lb' || rowUnit === 'lbs' ? 'lbs' : 'kg';
    let weight = rawWeight;
    if (weight != null && weight > 0 && unit !== targetUnit) {
      weight = targetUnit === 'kg' ? weight * 0.45359237 : weight / 0.45359237;
    }

    const key = `${date}|${start || ''}|${workout}`;
    if (!sessions.has(key)) {
      sessions.set(key, {
        key,
        date,
        day: weekdayForDate(date),
        start: start || null,
        end: end || null,
        duration: end != null && start != null ? end - start : 0,
        name: workout,
        note,
        entries: new Map(),
        setCount: 0,
      });
    }
    const session = sessions.get(key);
    if (!session.entries.has(exercise)) session.entries.set(exercise, []);
    const set = {
      w: weight != null && weight > 0 ? String(round2(weight)) : '',
      r: String(Math.round(reps)),
      c: true,
    };
    const type = setType(cell(row, columns.setType));
    if (type) set.type = type;
    const rpe = number(cell(row, columns.rpe));
    const rir = number(cell(row, columns.rir));
    if (rpe != null && rpe >= 1 && rpe <= 10) set.rpe = rpe;
    if (rir != null && rir >= 0 && rir <= 10) set.rir = rir;
    session.entries.get(exercise).push(set);
    session.setCount++;
    totalSets++;
  }

  const result = [];
  for (const session of sessions.values()) {
    if (!session.setCount) continue;
    result.push({
      ...session,
      entries: Object.fromEntries(session.entries),
    });
  }
  result.sort((a, b) => a.date.localeCompare(b.date) || (a.start || 0) - (b.start || 0));
  return { sessions: result, skippedCardio, skippedInvalid, totalSets };
}


// Common display-name variants from external catalogues. These are names and
// training vocabulary, not copied exercise data; they let a re-imported openHybrid
// history land under the same catalogue entries instead of creating duplicates.
export const EXTERNAL_EXERCISE_ALIASES = {
  'Resistance Band Triceps Pushdown': 'Band Triceps Pushdown',
  'Barbell Standing Military Press': 'Barbell Overhead Press',
  'Dumbbell Incline Bench Press': 'Incline Dumbbell Press',
  'Barbell Deadlift': 'Conventional Deadlift',
  'Dumbbell Chest Supported Row': 'Chest-Supported Dumbbell Row',
  'Dumbbell Rear Delt Fly': 'Rear-Delt Fly',
  'Barbell Full Squat': 'Back Squat',
  'Barbell Romanian Deadlift': 'Romanian Deadlift',
  'Barbell Incline Bench Press': 'Incline Barbell Bench Press',
  'Dumbbell Lying Triceps Extension': 'Skull Crusher',
  'Dumbbell Seated Shoulder Press': 'Dumbbell Shoulder Press',
  'Dumbbell Incline Curl': 'Incline Dumbbell Curl',
  'Dumbbell One Arm Bent Over Row': 'One-Arm Dumbbell Row',
  'Dumbbell Single Arm Bent Over Row': 'One-Arm Dumbbell Row',
  'Barbell Close-Grip Bench Press': 'Close-Grip Bench Press',
  'Weighted Straight Bar Dip': 'Dip',
  'Dumbbell Biceps Curl': 'Dumbbell Curl',
  'Dumbbell Walking Lunge': 'Walking Lunge',
  'Ez Barbell Lying Triceps Extension': 'EZ-Bar Skull Crusher',
  'Ez Barbell Curl': 'EZ-Bar Curl',
  'Band Kneeling Lat Pulldown': 'Band Lat Pulldown',
  'Barbell Front Squat': 'Front Squat',
  'Dumbbell Rear Lunge': 'Reverse Lunge',
  'Barbell Pause Bench Press': 'Paused Barbell Bench Press',
  'Barbell Pause Deadlift': 'Paused Conventional Deadlift',
  'Dumbbell Half Kneeling Military Press': 'Dumbbell Shoulder Press',
  'Dumbbell Lying Floor Skullcrusher': 'Skull Crusher',
};

const aliasKey = (name) => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const EXTERNAL_ALIAS_BY_KEY = new Map(
  Object.entries(EXTERNAL_EXERCISE_ALIASES).map(([from, to]) => [aliasKey(from), to]),
);

function externalCanonicalCandidate(name) {
  return EXTERNAL_ALIAS_BY_KEY.get(aliasKey(name)) || name;
}

function hash(value) {
  let h = 0x811c9dc5;
  const str = String(value);
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/**
 * Map parsed sessions into archived week records. Pure: it does not mutate the
 * input state. Existing archive keys are skipped, so re-importing the same file
 * is idempotent.
 *
 * @param {any} state
 * @param {ReturnType<typeof parseWorkoutCsv>} parsed
 * @param {{ resolveName?: (name: string) => string|null }} [opts]
 */
export function applyWorkoutCsvImport(state, parsed, opts = {}) {
  const resolveName = typeof opts.resolveName === 'function' ? opts.resolveName : () => null;
  if (!state.weeks || typeof state.weeks !== 'object') state.weeks = {};
  if (!Array.isArray(state.customExercises)) state.customExercises = [];

  const added = [];
  const skipped = [];
  const custom = new Set(state.customExercises);
  let sets = 0;

  for (const session of parsed.sessions || []) {
    const sessionId = `og_${hash(session.key)}`;
    const key = `arch:import:${sessionId}`;
    if (state.weeks[key]) { skipped.push(key); continue; }

    const lifts = {};
    const liftOrder = [];
    for (const [rawName, rawSets] of Object.entries(session.entries || {})) {
      const candidate = externalCanonicalCandidate(rawName);
      const resolved = resolveName(candidate);
      const name = String(resolved || candidate).trim();
      if (!name || !Array.isArray(rawSets) || !rawSets.length) continue;
      if (!lifts[name]) { lifts[name] = []; liftOrder.push(name); }
      lifts[name].push(...rawSets);
      sets += rawSets.length;
      // A name the catalogue does not know is a legitimate custom exercise.
      if (resolved == null) custom.add(name);
    }
    if (!liftOrder.length) continue;

    const day = session.day;
    state.weeks[key] = {
      activationId: 'imported',
      programId: 'imported',
      sessionId,
      sessionTitle: session.name || 'Imported Workout',
      source: 'csv-import',
      sourceActivityId: session.key,
      dates: { [day]: session.date },
      lifts: { [day]: lifts },
      liftOrder: { [day]: liftOrder },
      liftMeta: { [day]: {} },
      notes: { [day]: session.note || '' },
      gymRpe: { [day]: '' },
      bodyWeight: {},
      gymStats: { [day]: { time: durationText(session.duration), avgHR: '', maxHR: '', cals: '' } },
      sessionStatus: { [day]: 'finished' },
      runs: {},
      runSessions: {},
    };
    added.push(key);
  }

  state.customExercises = [...custom];
  return { added, skipped, sets };
}
