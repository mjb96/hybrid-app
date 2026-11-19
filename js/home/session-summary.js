// @ts-check
// =============================================================================
// SESSION SUMMARY — the completed-work evidence shown under Today
//
// One pure model over the stored day (no new persisted fields) plus its view.
// Duration comes from the finish modal's confirmed `gymStats[day].time`, so old
// sessions without one simply omit the tile rather than inventing a number.
// =============================================================================
import { dayVolume, isValidWorkingSet } from '../set-utils.js';
import { buildSessionMuscles } from './session-muscles.js';
import { muscleHeatmapHTML } from './body-heatmap.js';
import { escapeHtml } from '../util.js';

/**
 * "42:00" → "42 min", "1:02:30" → "1 hr 2 min", "0:45" → "45 s".
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
export function formatGymDuration(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parts = raw.split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return '';
  let seconds = 0;
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  else seconds = parts[0];
  if (!(seconds > 0)) return '';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/**
 * @param {any} state
 * @param {string|number} weekKey
 * @param {string} day
 */
export function buildSessionSummary(state, weekKey, day) {
  const week = state?.weeks?.[weekKey];
  const lifts = week?.lifts?.[day] || {};
  const sets = Object.values(lifts).flat().filter(isValidWorkingSet);
  const volume = dayVolume(lifts);
  const prs = sets.filter((set) => set?.isPR === true).length;
  const duration = formatGymDuration(week?.gymStats?.[day]?.time);
  const finishedAt = week?.sessionSummary?.[day]?.finishedAt || null;
  const date = week?.dates?.[day] || null;
  const weighIn = date
    ? (state?.bodyWeightLog || []).find((entry) => entry?.date === date)
    : null;
  const bodyWeight = weighIn && Number(weighIn.weight) > 0 ? Number(weighIn.weight) : null;
  const muscles = buildSessionMuscles(lifts);

  return {
    day,
    sets: sets.length,
    volume,
    prs,
    duration,
    finishedAt,
    bodyWeight,
    muscles,
    hasData: sets.length > 0 || volume > 0,
  };
}

/**
 * @param {ReturnType<typeof buildSessionSummary>|null|undefined} summary
 * @param {{ weightUnit?: 'kg'|'lbs' }} [options]
 * @returns {string}
 */
export function sessionSummaryHTML(summary, options = {}) {
  if (!summary?.hasData) return '';
  const unit = options.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const stats = [];
  if (summary.duration) stats.push({ value: summary.duration, label: 'Duration' });
  if (summary.volume > 0) {
    stats.push({
      value: `${Math.round(summary.volume).toLocaleString('en-AU')} ${unit}`,
      label: 'Volume',
    });
  }
  if (summary.sets > 0) stats.push({ value: String(summary.sets), label: 'Sets' });

  const prs = summary.prs > 0
    ? `<span class="session-summary__pr">🏆 ${summary.prs} PR${summary.prs === 1 ? '' : 's'}</span>`
    : '';
  const chips = summary.muscles.hasData
    ? `<div class="session-summary__muscles" aria-label="Muscles worked">
        ${summary.muscles.top.map((muscle) => `<span class="session-summary__chip${muscle.primary ? ' is-primary' : ''}">${escapeHtml(muscle.label)}</span>`).join('')}
      </div>`
    : '';
  const bodyWeight = summary.bodyWeight != null
    ? `<p class="session-summary__body">⚖ <b>${escapeHtml(String(summary.bodyWeight))} ${unit}</b> today</p>`
    : '';

  return `<section class="session-summary" aria-label="Session summary">
    ${prs}
    ${stats.length ? `<div class="session-summary__stats">
      ${stats.map((stat) => `<div class="session-summary__stat"><b>${escapeHtml(stat.value)}</b><span>${escapeHtml(stat.label)}</span></div>`).join('')}
    </div>` : ''}
    ${muscleHeatmapHTML(summary.muscles)}
    ${chips}
    ${bodyWeight}
  </section>`;
}
