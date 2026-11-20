// @ts-check
// ==========================================
// SET UTILITIES (set-utils.js)
// Canonical helpers for interpreting a logged set. Leaf module (no imports) so
// every view can share one definition instead of re-inlining the predicate.
//
// A set has one of three SHAPES. Legacy sets carry no `mode` and are rep sets;
// `mode: 'time'` reads `sec`, and `mode: 'distance'` reads `dist` (metres).
// A rep set's `r` is never reinterpreted as seconds/metres, and a hold/carry is
// never given invented reps just to satisfy an analytics reader.
// ==========================================

export const SET_MODE = Object.freeze({ REPS: 'reps', TIME: 'time', DISTANCE: 'distance' });

/**
 * Canonical "is this set completed?" check. Tolerates every legacy encoding of
 * the `c` flag (`true`, `'true'`, `'on'`, `1`) that has appeared in stored data.
 * @param {any} s
 * @returns {boolean}
 */
export function isCompletedSet(s) {
  if (!s) return false;
  return s.c === true || s.c === 'true' || s.c === 'on' || s.c === 1;
}

/**
 * Warm-up sets are excluded from volume / e1RM. Covers both the current `type`
 * marker and the legacy `isWarmup` flag.
 * @param {any} s
 * @returns {boolean}
 */
export function isWarmupSet(s) {
  return !!(s && (s.type === 'W' || s.isWarmup));
}

/**
 * The shape this set is logged in.
 *
 * An explicit `mode` always wins. A stored set with no mode but a positive rep
 * count is a legacy rep set even on an exercise whose default is a hold — a
 * Plank logged as reps before this field existed must keep rendering as reps.
 * @param {any} s
 * @returns {'reps'|'time'|'distance'}
 */
export function setModeOf(s) {
  if (s?.mode === SET_MODE.TIME) return SET_MODE.TIME;
  if (s?.mode === SET_MODE.DISTANCE) return SET_MODE.DISTANCE;
  if (s?.mode === SET_MODE.REPS) return SET_MODE.REPS;
  // Tolerate a value written before its mode was stamped (a draft typed into a
  // time/distance row): the positive value is the honest signal. Legacy sets
  // have neither field and stay reps.
  if ((Number(s?.sec) || 0) > 0) return SET_MODE.TIME;
  if ((Number(s?.dist) || 0) > 0) return SET_MODE.DISTANCE;
  return SET_MODE.REPS;
}

/** @param {any} s */
export function isRepSet(s) {
  return setModeOf(s) === SET_MODE.REPS;
}

/** @param {any} s */
export function isTimeSet(s) {
  return setModeOf(s) === SET_MODE.TIME;
}

/** @param {any} s */
export function isDistanceSet(s) {
  return setModeOf(s) === SET_MODE.DISTANCE;
}

/**
 * A set eligible for strength frequency, history and volume analytics.
 * Weight is deliberately optional (bodyweight/band work); reps, seconds or
 * metres must be positive, depending on the set's shape.
 * @param {any} s
 * @returns {boolean}
 */
export function isValidWorkingSet(s) {
  if (!isCompletedSet(s) || isWarmupSet(s)) return false;
  const mode = setModeOf(s);
  if (mode === SET_MODE.TIME) return (parseFloat(s?.sec) || 0) > 0;
  if (mode === SET_MODE.DISTANCE) return (parseFloat(s?.dist) || 0) > 0;
  return (parseInt(s?.r, 10) || 0) > 0;
}

/**
 * Tonnage for a single set (weight × reps), coercing string inputs.
 *
 * `basis: 'each'` means the entered dumbbell load is PER IMPLEMENT, so a pair
 * contributes twice the tonnage. Absence (all legacy sets) means the entered
 * number is the total load and is multiplied once — the old behaviour exactly.
 * e1RM deliberately does NOT use this multiplier: it is a per-implement
 * estimate, and doubling it would mint false PRs.
 *
 * Holds and carries deliberately return 0: tonnage is weight × REPS, and
 * inventing reps for a 45-second plank would inflate every volume total. They
 * still count as working sets (session frequency, consistency, muscle load).
 * @param {any} s
 * @returns {number}
 */
export function setVolume(s) {
  if (!isRepSet(s)) return 0;
  const multiplier = s?.basis === 'each' ? 2 : 1;
  return (parseFloat(s?.w) || 0) * (parseInt(s?.r, 10) || 0) * multiplier;
}

/**
 * Sum completed-set tonnage across a day's lifts object
 * (`{ liftName: [sets] }`). Warm-ups are excluded unless `includeWarmups`.
 * @param {Record<string, any[]>} dayLifts
 * @param {{ includeWarmups?: boolean }} [opts]
 * @returns {number}
 */
export function dayVolume(dayLifts, { includeWarmups = false } = {}) {
  let vol = 0;
  for (const lift in (dayLifts || {})) {
    const sets = dayLifts[lift];
    if (!Array.isArray(sets)) continue;
    for (const s of sets) {
      if ((includeWarmups ? isCompletedSet(s) : isValidWorkingSet(s))) vol += setVolume(s);
    }
  }
  return vol;
}

/**
 * Format seconds as a compact hold time: `45`, `1:30`, `1:02:05`.
 * @param {any} value
 * @returns {string}
 */
export function formatDuration(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  if (total < 60) return String(total);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Parse a user-typed hold time. Accepts plain seconds (`90`) and `M:SS` /
 * `H:MM:SS`. Returns null for blank/invalid/non-positive input so callers can
 * show their own message rather than storing NaN.
 * @param {any} value
 * @returns {number|null}
 */
export function parseDuration(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }
  const parts = text.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  const seconds = parts.length === 2
    ? numbers[0] * 60 + numbers[1]
    : numbers[0] * 3600 + numbers[1] * 60 + numbers[2];
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (parts.length > 1 && numbers.slice(1).some((part) => part > 59)) return null;
  return seconds;
}

/**
 * Format metres for a carry: whole metres unless a fraction was recorded.
 * @param {any} value
 * @returns {string}
 */
export function formatDistance(value) {
  const metres = Number(value) || 0;
  return Number.isInteger(metres) ? String(metres) : String(Math.round(metres * 10) / 10);
}

/**
 * One human-readable line for a stored set, e.g. `60kg × 8`, `60kg × 1:30`,
 * `20kg × 20m`, or `8 reps` when no load was recorded.
 * @param {any} s
 * @param {string} [unit]
 * @returns {string}
 */
export function setSummary(s, unit = 'kg') {
  const mode = setModeOf(s);
  const weight = parseFloat(s?.w) || 0;
  const load = weight > 0
    ? `${Number.isInteger(weight) ? weight : Math.round(weight * 100) / 100}${unit}`
    : (s?.bw || s?.loadMode === 'bodyweight') ? 'BW' : '';
  if (mode === SET_MODE.TIME) {
    const hold = formatDuration(s?.sec);
    return load ? `${load} × ${hold}` : hold;
  }
  if (mode === SET_MODE.DISTANCE) {
    const carry = `${formatDistance(s?.dist)}m`;
    return load ? `${load} × ${carry}` : carry;
  }
  const reps = parseInt(s?.r, 10) || 0;
  return load ? `${load} × ${reps}` : `${reps} reps`;
}
