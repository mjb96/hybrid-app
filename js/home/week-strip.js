// @ts-check
// =============================================================================
// HOME WEEK STRIP — a pure, calendar-aware model for the seven-day training
// strip. The UI renders it; this module decides done / today / missed / rest.
// =============================================================================
import { isCompletedSet } from '../set-utils.js';
import { runSessionsForDay } from '../state/run-sessions.js';
import { resolveSlotDate } from '../analytics/logged-days.js';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const REST_RE = /(^|\b)(rest|no structured|no lifting|recovery)(\b|$)/i;

function orderedDays(weekStartDay) {
  const start = DAY_ORDER.indexOf(weekStartDay);
  if (start <= 0) return DAY_ORDER.slice();
  return [...DAY_ORDER.slice(start), ...DAY_ORDER.slice(0, start)];
}

function hasCompletedWork(week, day) {
  const lifts = week?.lifts?.[day] || {};
  for (const sets of Object.values(lifts)) {
    if (Array.isArray(sets) && sets.some(isCompletedSet)) return true;
  }
  return runSessionsForDay(week, day).some((run) => Number(run?.dist) > 0);
}

function hasPlan(program, day) {
  const plan = program?.days?.[day];
  if (!plan) return false;
  if (Array.isArray(plan.lifts) && plan.lifts.length > 0) return true;
  const runs = String(plan.runs || '').trim();
  return !!runs && !REST_RE.test(runs);
}

/**
 * @param {{ state:any, program:any, days?:string[], today?:string }} opts
 * @returns {{ days: Array<{day:string,label:string,date:string|null,status:string,planned:boolean,done:boolean,isToday:boolean}>,
 *   doneCount:number, plannedCount:number, pct:number|null, range:string }}
 */
export function buildHomeWeekStrip({ state, program = null, days = DAY_ORDER, today }) {
  const weekKey = String(state?.currentWeek || '1');
  const week = state?.weeks?.[weekKey] || {};
  const order = orderedDays(state?.settings?.weekStartDay || 'mon').filter((day) => days.includes(day));
  const cells = [];
  let doneCount = 0;
  let plannedCount = 0;

  order.forEach((day) => {
    const stored = week?.dates?.[day] || null;
    const date = stored || resolveSlotDate(state, Number(weekKey) || 1, DAY_ORDER.indexOf(day), null);
    const planned = hasPlan(program, day);
    const done = hasCompletedWork(week, day);
    const isToday = !!date && date === today;
    let status = 'rest';
    if (done) status = 'done';
    else if (isToday) status = planned ? 'today' : 'rest';
    else if (date && today && date > today) status = planned ? 'planned' : 'rest';
    else if (date && today && date < today) status = planned ? 'missed' : 'rest';
    else if (planned) status = 'planned';

    if (planned) plannedCount++;
    if (done) doneCount++;
    cells.push({
      day,
      label: DAY_LABELS[day] || day,
      date,
      status,
      planned,
      done,
      isToday,
    });
  });

  const dates = cells.map((cell) => cell.date).filter(Boolean).sort();
  return {
    days: cells,
    doneCount,
    plannedCount,
    pct: plannedCount > 0 ? Math.round((doneCount / plannedCount) * 100) : null,
    range: dates.length ? `${dates[0]} – ${dates[dates.length - 1]}` : '',
  };
}
