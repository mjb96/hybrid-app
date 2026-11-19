// @ts-check
// =============================================================================
// HOME WEEK VIEW — bounded history for the week surface
//
// Home keeps the CURRENT week as the decision surface. The four previous weeks
// are a recap: which days were trained, how much work, and which muscles. This
// is deliberately not a second Progress/History browser.
//
// Data comes from indexSlotsByDate (date-strict, deduped across activations) and
// is merged per calendar date. It never reads `state.currentWeek` as a calendar
// week — that is a program counter, not a date.
// =============================================================================
import { addDaysISO, indexSlotsByDate } from '../analytics/weekly-aggregate.js';
import { dayVolume, isValidWorkingSet } from '../set-utils.js';
import { buildSessionMuscles } from './session-muscles.js';
import { muscleHeatmapHTML } from './body-heatmap.js';
import { escapeHtml } from '../util.js';

/** How many weeks before the current one the Home rail can show. */
export const HOME_WEEK_HISTORY = 4;

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

/**
 * @param {number} offset 0 = current, -1 = last week, …
 * @returns {string}
 */
export function weekOffsetLabel(offset) {
  const value = Math.max(-HOME_WEEK_HISTORY, Math.min(0, Number(offset) || 0));
  if (value === 0) return 'This week';
  if (value === -1) return 'Last week';
  return `${Math.abs(value)} weeks ago`;
}

/**
 * @param {string} dateISO
 * @returns {string}
 */
function shortDate(dateISO) {
  const [y, m, d] = String(dateISO || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d, 12))
    .toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/**
 * @param {string} startISO
 * @returns {string}
 */
function rangeLabel(startISO) {
  const end = addDaysISO(startISO, 6);
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd, 12));
  const finish = new Date(Date.UTC(ey, em - 1, ed, 12));
  const sameMonth = sm === em && sy === ey;
  const startText = start.toLocaleDateString('en-AU', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endText = finish.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  return `${startText} – ${endText}`;
}

/**
 * @param {object} state
 * @param {{ startISO: string, offset: number, index?: ReturnType<typeof indexSlotsByDate> }} options
 */
export function buildPastWeekView(state, options) {
  const startISO = options.startISO;
  const index = options.index || indexSlotsByDate(state);
  const offset = Math.max(-HOME_WEEK_HISTORY, Math.min(0, Number(options.offset) || 0));
  const cells = [];
  /** @type {Record<string, any[]>} */
  const combinedLifts = {};
  let sessions = 0;
  let volume = 0;
  let sets = 0;
  let prs = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDaysISO(startISO, i);
    const day = DAY_KEYS[i];
    const slots = index.allByDate?.get(date) || [];
    for (const slot of slots) {
      sessions += 1;
      if (slot.lifts) {
        for (const [name, rows] of Object.entries(slot.lifts)) {
          if (!Array.isArray(rows)) continue;
          combinedLifts[name] = [...(combinedLifts[name] || []), ...rows];
        }
      }
    }
    const dayLifts = {};
    for (const slot of slots) {
      if (!slot.lifts) continue;
      for (const [name, rows] of Object.entries(slot.lifts)) {
        if (!Array.isArray(rows)) continue;
        dayLifts[name] = [...(dayLifts[name] || []), ...rows];
      }
    }
    for (const rows of Object.values(dayLifts)) {
      for (const set of rows) {
        if (!isValidWorkingSet(set)) continue;
        sets += 1;
        volume += (parseFloat(set?.w) || 0) * (parseInt(set?.r, 10) || 0);
        if (set?.isPR === true) prs += 1;
      }
    }
    const done = slots.length > 0;
    cells.push({
      day,
      label: DAY_LABELS[day],
      date,
      status: done ? 'done' : 'rest',
      planned: false,
      done,
      isToday: false,
      sessions: slots.length,
    });
  }

  const muscles = buildSessionMuscles(combinedLifts);
  return {
    offset,
    startISO,
    label: weekOffsetLabel(offset),
    range: rangeLabel(startISO),
    cells,
    doneCount: cells.filter((cell) => cell.done).length,
    sessions,
    volume,
    sets,
    prs,
    muscles,
    hasData: sessions > 0 || sets > 0,
  };
}

/**
 * @param {ReturnType<typeof buildPastWeekView>} view
 * @param {{ weightUnit?: 'kg'|'lbs' }} [options]
 * @returns {string}
 */
export function weekRecapHTML(view, options = {}) {
  if (!view) return '';
  const unit = options.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const title = view.sessions
    ? `${view.sessions} session${view.sessions === 1 ? '' : 's'}`
    : 'No training logged';
  const stats = view.hasData
    ? `<div class="session-summary__stats">
        <div class="session-summary__stat"><b>${view.sessions}</b><span>${view.sessions === 1 ? 'Session' : 'Sessions'}</span></div>
        <div class="session-summary__stat"><b>${Math.round(view.volume).toLocaleString('en-AU')} ${unit}</b><span>Volume</span></div>
        <div class="session-summary__stat"><b>${view.sets}</b><span>Sets</span></div>
      </div>`
    : '';
  const prs = view.prs > 0
    ? `<span class="session-summary__pr">🏆 ${view.prs} PR${view.prs === 1 ? '' : 's'}</span>`
    : '';
  const chips = view.muscles.hasData
    ? `<div class="session-summary__muscles" aria-label="Muscles worked">
        ${view.muscles.top.map((muscle) => `<span class="session-summary__chip${muscle.primary ? ' is-primary' : ''}">${escapeHtml(muscle.label)}</span>`).join('')}
      </div>`
    : '';
  const body = view.hasData
    ? `<div class="session-summary">
        ${prs}${stats}
        ${muscleHeatmapHTML(view.muscles)}
        ${chips}
      </div>`
    : `<p class="today-card__guidance">Nothing was logged in this week. The plan is still there — rest is part of it.</p>`;

  return `<article class="today-card today-card--rest week-recap" data-today-state="week" data-week-offset="${view.offset}" aria-labelledby="homeWeekRecapTitle">
    <div class="today-card__head">
      <span class="today-card__eyebrow">Week recap</span>
      <h2 id="homeWeekRecapTitle" class="today-card__title">${escapeHtml(title)}</h2>
      <p class="today-card__meta">${escapeHtml(view.range)}</p>
    </div>
    <div class="today-card__detail">
      ${body}
    </div>
    <div class="today-card__actions">
      <button type="button" class="today-card__secondary" data-action="home-week-today">Back to this week</button>
    </div>
  </article>`;
}
