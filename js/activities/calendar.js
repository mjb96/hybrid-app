// @ts-check
// =============================================================================
// HISTORY CALENDAR — pure month grid over the canonical activity rows.
//
// The old Progress calendar built its own map from `weeks[].lifts/runs`, which
// missed archived/imported sessions and could disagree with History. This model
// groups the SAME rows History renders, so a day with two activities is one
// cell with two session dots and opens both.
// =============================================================================

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateKey(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

/**
 * @param {Array<any>} rows
 * @param {number} year
 * @param {number} month 0-11
 * @param {string} [weekStartDay] 'mon' | 'sun'
 */
export function buildActivityCalendar(rows, year, month, weekStartDay = 'mon') {
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : new Date().getFullYear();
  const safeMonth = Number.isFinite(month) ? Math.min(11, Math.max(0, Math.trunc(month))) : new Date().getMonth();
  const first = new Date(safeYear, safeMonth, 1);
  const sunStart = weekStartDay === 'sun';
  const leading = sunStart ? first.getDay() : (first.getDay() + 6) % 7;
  const daysInMonth = new Date(safeYear, safeMonth + 1, 0).getDate();

  /** @type {Map<string, any[]>} */
  const byDate = new Map();
  for (const row of rows || []) {
    if (!row?.localDate) continue;
    const list = byDate.get(row.localDate) || [];
    list.push(row);
    byDate.set(row.localDate, list);
  }

  const cells = [];
  for (let i = 0; i < leading; i++) cells.push({ date: null, day: null, rows: [] });
  for (let day = 1; day <= daysInMonth; day++) {
    const date = dateKey(safeYear, safeMonth, day);
    const dayRows = byDate.get(date) || [];
    cells.push({
      date,
      day,
      rows: dayRows,
      strength: dayRows.filter((row) => row.kind === 'strength').length,
      runs: dayRows.filter((row) => row.kind === 'run').length,
    });
  }

  return {
    year: safeYear,
    month: safeMonth,
    label: `${MONTH_NAMES[safeMonth]} ${safeYear}`,
    cells,
    leading,
    daysInMonth,
    weekStartDay: sunStart ? 'sun' : 'mon',
    hasActivity: cells.some((cell) => cell.rows.length > 0),
  };
}

/** Previous/next month, rolling the year. */
export function shiftCalendarMonth(year, month, delta) {
  const next = new Date(year, month + (Number(delta) || 0), 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

/** The month to show first: the newest activity, else the current month. */
export function latestActivityMonth(rows, fallback = new Date()) {
  let newest = null;
  for (const row of rows || []) {
    if (!row?.localDate) continue;
    if (!newest || row.localDate > newest) newest = row.localDate;
  }
  if (newest) {
    const [year, month] = newest.split('-').map(Number);
    if (year && month) return { year, month: month - 1 };
  }
  return { year: fallback.getFullYear(), month: fallback.getMonth() };
}
