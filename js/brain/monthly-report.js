// @ts-check
// =============================================================================
// MONTHLY REPORT (js/brain/monthly-report.js) — roadmap R13
//
// A 28-day rollup: totals + trend vs the previous 28 days, average Hybrid Score
// and its direction, fitness (CTL) trend, consistency, and the top forward
// projection. Pure; reuses the dashboard model, the score history, dayVolume,
// and the predictions engine. reportToText() renders share/notification copy.
// =============================================================================
import { computeDashboardModel } from '../home/dashboard-model.js';
import { forEachLoggedDay } from '../analytics/logged-days.js';
import { buildPredictions, topPredictionLine } from './predictions.js';
import { addDaysISO, dateKey } from '../dates.js';

// Every logged day → { dateISO, volume, distance, sessions } via the shared
// iterator. `sessions` counts strength + every run, never unique dates.
function datedSessions(state, days) {
  const out = [];
  forEachLoggedDay(state, days, (d) => out.push({
    dateISO: d.dateISO,
    volume: d.volume,
    distance: d.distance,
    sessions: Number(d.sessionCount) || 0,
  }));
  return out;
}

const pctDelta = (cur, prev) => (!prev || prev <= 0) ? null : Math.round(((cur - prev) / prev) * 100);

function windowTotals(sessions, startISO, endISO) {
  let volume = 0, distance = 0, count = 0; const dayset = new Set();
  for (const s of sessions) {
    if (s.dateISO >= startISO && s.dateISO < endISO) {
      volume += s.volume;
      distance += s.distance;
      count += s.sessions || 0;
      dayset.add(s.dateISO);
    }
  }
  return {
    volume: Math.round(volume),
    distanceKm: Math.round(distance * 10) / 10,
    sessions: count,
    activeDays: dayset.size,
  };
}

function avgScoreInWindow(state, startISO, endISO) {
  const hist = (state?.hybridScore?.history || []).filter(h => h.date >= startISO && h.date < endISO);
  if (!hist.length) return null;
  return Math.round(hist.reduce((s, h) => s + h.score, 0) / hist.length);
}

/**
 * One period rollup: totals + the same-length prior window. `windowDays` drives
 * both the range and the comparison window, so a 30-day and a 12-month report
 * are the same maths with different bounds.
 */
export function buildPeriodReport(state, days, program, { windowDays = 28, now = new Date() } = {}) {
  const span = Math.max(1, Math.round(windowDays));
  const todayISO = dateKey(now);
  const endISO = addDaysISO(todayISO, 1); // exclusive end, inclusive of today
  const startISO = addDaysISO(todayISO, -(span - 1));
  const prevEndISO = startISO;
  const prevStartISO = addDaysISO(startISO, -span);
  const label = span >= 365 ? 'Last 12 months' : span >= 90 ? 'Last 90 days' : 'Last 30 days';
  const comparisonWord = span >= 365 ? 'year' : span >= 90 ? '90 days' : 'month';

  const sessions = datedSessions(state, days);
  const cur = windowTotals(sessions, startISO, endISO);
  const prev = windowTotals(sessions, prevStartISO, prevEndISO);

  const model = computeDashboardModel(state, days, program, 'mon');
  const ctlSeries = (model.series?.ctl || []).filter(v => typeof v === 'number');
  const ctlTrend = ctlSeries.length >= 2
    ? (ctlSeries[ctlSeries.length - 1] > ctlSeries[0] ? 'rising' : ctlSeries[ctlSeries.length - 1] < ctlSeries[0] ? 'easing' : 'steady')
    : 'building';

  const avgScore = avgScoreInWindow(state, startISO, endISO);
  const prevAvgScore = avgScoreInWindow(state, prevStartISO, prevEndISO);

  const pred = buildPredictions(state, days);

  return {
    hasData: cur.sessions > 0 || avgScore !== null,
    window: { startISO, endISO, days: span, label, comparisonWord },
    totals: cur,
    deltas: {
      volumePct: pctDelta(cur.volume, prev.volume),
      distancePct: pctDelta(cur.distanceKm, prev.distanceKm),
      sessions: cur.sessions - prev.sessions,
    },
    hybridScore: { avg: avgScore, prevAvg: prevAvgScore, delta: (avgScore !== null && prevAvgScore !== null) ? avgScore - prevAvgScore : null },
    fitness: { ctl: Math.round(model.load?.ctl || 0), trend: ctlTrend },
    consistency: model.goal?.avgConsistency || 0,
    projection: topPredictionLine(pred, state?.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg'),
  };
}

export function buildMonthlyReport(state, days, program, now = new Date()) {
  return buildPeriodReport(state, days, program, { windowDays: 28, now });
}

export function buildYearReport(state, days, program, now = new Date()) {
  return buildPeriodReport(state, days, program, { windowDays: 365, now });
}

export function reportToText(r, distUnit = 'km', weightUnit = 'kg') {
  if (!r.hasData) return 'Your 30-day report will build as you train.';
  const dist = distUnit === 'mi' ? `${Math.round(r.totals.distanceKm * 0.621371)} mi` : `${r.totals.distanceKm} km`;
  const bits = [`${r.totals.sessions} sessions`, `${r.totals.volume.toLocaleString()} ${weightUnit}`, dist];
  const label = r.window?.label || 'Last 30 days';
  const comparisonWord = r.window?.comparisonWord || 'month';
  let txt = `${label} on openHybrid: ${bits.join(' · ')}.`;
  if (r.hybridScore.avg !== null) txt += ` Avg Hybrid Score ${r.hybridScore.avg}${r.hybridScore.delta ? ` (${r.hybridScore.delta > 0 ? '+' : ''}${r.hybridScore.delta} vs prior ${comparisonWord})` : ''}.`;
  txt += ` Fitness ${r.fitness.trend}.`;
  if (r.projection) txt += ` ${r.projection}`;
  return txt;
}
