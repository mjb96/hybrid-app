// ==========================================
// BODY WEIGHT VIEW (analytics/views/view-bodyweight.js)
//
// Progress → Body weight. The graph is the history; the summary is the part a
// single weigh-in cannot tell you: a 21-day weekly rate, a goal line and an
// optional lose/gain/hold corridor. Weekly means keep the history honest when
// water and salt move a morning.
// ==========================================
import { renderBodyWeightWithMA } from '../charts.js';
import { buildBodyweightModel } from '../../metrics/bodyweight.js';
import { formatDayMonth, todayKey } from '../../dates.js';

let rangeDays = 90;

/** @param {number|string} days */
export function setBodyweightRange(days) {
  const value = Number(days);
  rangeDays = value === 0 ? 0 : (Number.isFinite(value) && value > 0 ? Math.round(value) : 90);
}

export function getBodyweightRange() {
  return rangeDays;
}

/** @param {number} value @param {string} unit */
const fmtWeight = (value, unit) => `${Number(value).toFixed(1)} ${unit}`;

/** @param {number} value */
const signed = (value) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

/**
 * @param {ReturnType<typeof buildBodyweightModel>} model
 * @param {any} state
 */
function summaryHtml(model, state) {
  if (!model.latest) return '<p class="bw-summary__note">Log a weigh-in to start the trend.</p>';
  const unit = model.unit;
  const log = (state.bodyWeightLog || []).filter((entry) => entry && entry.date && Number(entry.weight) > 0);
  const cutoff = new Date(Date.now() - 7 * 86400000);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  const recent = log.filter((entry) => entry.date >= cutoffKey).map((entry) => Number(entry.weight));
  const avg7 = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : model.latest.weight;
  const first = model.points[0]?.weight;
  const delta = first != null ? model.latest.weight - first : null;
  const rate = model.rate;
  const missing = Math.max(0, 6 - (rate.n || 0));
  const rateText = rate.enough
    ? `Trend ${signed(rate.perWeek)} ${unit}/week (${signed(rate.pct)}%)`
    : rate.n >= 6
      ? 'Spread your weigh-ins across at least 10 days for a weekly trend.'
      : `Need ${missing} more weigh-in${missing === 1 ? '' : 's'} across 10 days for a weekly trend.`;
  const statusText = {
    in: 'On pace',
    slow: 'Slower than planned',
    fast: 'Faster than planned',
    off: 'Outside your range',
  }[model.status] || '';
  const goalText = model.targetWeight
    ? `Goal ${fmtWeight(model.targetWeight, unit)} · ${Math.abs(model.latest.weight - model.targetWeight).toFixed(1)} ${unit} to go`
    : 'No goal weight set';
  const low = Math.min(Math.abs(model.corridor?.min || 0), Math.abs(model.corridor?.max || 0));
  const high = Math.max(Math.abs(model.corridor?.min || 0), Math.abs(model.corridor?.max || 0));
  const corridor = model.corridor
    ? `${model.corridor.dir === 'hold' ? 'Hold within ±' : model.corridor.dir === 'gain' ? 'Gain ' : 'Lose '}${low === high ? low : `${low}–${high}`} ${model.corridor.by === '%' ? '% / week' : `${unit} / week`}`
    : 'No rate range set';

  return `<div class="bw-summary" aria-live="polite">
    <div class="bw-summary__row"><span>Latest · ${formatDayMonth(model.latest.date)}</span><strong>${fmtWeight(model.latest.weight, unit)}</strong></div>
    <div class="bw-summary__row"><span>7-day average</span><strong>${fmtWeight(avg7, unit)}</strong></div>
    <div class="bw-summary__row"><span>Change over this range</span><strong>${delta == null ? '—' : `${signed(delta)} ${unit}`}</strong></div>
    <div class="bw-summary__row"><span>${rateText}</span>${statusText ? `<strong class="bw-summary__status" style="color:${model.status === 'in' ? 'var(--color-green)' : 'var(--color-amber)'}">${statusText}</strong>` : ''}</div>
    <div class="bw-summary__row"><span>${goalText}</span><strong>${corridor}</strong></div>
  </div>`;
}

/**
 * @param {ReturnType<typeof buildBodyweightModel>} model
 */
function weeklyHtml(model) {
  if (!model.weekly.length) return '';
  const rows = model.weekly.slice(0, 10).map((week) => {
    const delta = week.delta == null ? '' : `<small>${signed(week.delta)} ${model.unit}</small>`;
    return `<button type="button" class="bw-week-row" data-action="edit-bw-row" data-date="${week.key}">
      <span>Week of ${formatDayMonth(week.key)} <small>· ${week.n} weigh-in${week.n === 1 ? '' : 's'}</small></span>
      <strong>${fmtWeight(week.avg, model.unit)} ${delta}</strong>
    </button>`;
  }).join('');
  return `<article class="card-dark p-3 bw-week-card">
    <div class="flex-between" style="align-items:baseline;gap:12px;"><strong style="font-size:.82rem;">Weekly averages</strong><small class="text-muted" style="font-size:.66rem;">Newest first</small></div>
    ${rows}
  </article>`;
}

/**
 * @param {any} model
 * @param {any} state
 */
function syncGoalEditor(model, state) {
  const target = document.getElementById('bwGoalWeight');
  if (target && document.activeElement !== target) target.value = model.targetWeight || '';
  const goal = state.settings?.rateGoal || null;
  const dir = document.getElementById('bwRateDir');
  const by = document.getElementById('bwRateBy');
  const lo = document.getElementById('bwRateLo');
  const hi = document.getElementById('bwRateHi');
  if (dir && document.activeElement !== dir) dir.value = goal?.dir || '';
  if (by && document.activeElement !== by) by.value = goal?.by || '%';
  if (lo && document.activeElement !== lo) lo.value = goal?.lo ?? '';
  if (hi && document.activeElement !== hi) hi.value = goal?.hi ?? '';
}

/**
 * @param {any} _data
 * @param {() => any} getState
 */
export function renderBodyWeightAnalytics(_data, getState) {
  const state = getState();
  const model = buildBodyweightModel(state, { rangeDays });
  const unit = model.unit;
  const container = document.getElementById('bwChartContainer');
  if (container) renderBodyWeightWithMA(container, model.points, { unit, goal: model.targetWeight });

  const summary = document.getElementById('bwSummary');
  if (summary) summary.innerHTML = summaryHtml(model, state);

  const weekly = document.getElementById('bwWeeklyStats');
  if (weekly) weekly.innerHTML = weeklyHtml(model);

  const date = document.getElementById('analyticsBwDate');
  if (date && !date.value) date.value = todayKey();
  const lastHint = document.getElementById('bwLastHint');
  if (lastHint) {
    lastHint.textContent = model.latest
      ? `Last ${fmtWeight(model.latest.weight, unit)} · ${formatDayMonth(model.latest.date)}`
      : 'No weigh-ins yet';
  }
  syncGoalEditor(model, state);

  document.querySelectorAll('[data-action="bw-range"]').forEach((button) => {
    button.classList.toggle('active', Number(button.getAttribute('data-days')) === rangeDays);
  });
}
