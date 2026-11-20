// @ts-check
// =============================================================================
// PLATE HINT DOM (js/workout/plate-hint-dom.js)
//
// The per-side hint is athlete-configured text. It must never be interpolated
// into an HTML string, even escaped, because that keeps a DOM-text → innerHTML
// path alive for static analysis. buildExerciseCard renders an empty
// `[data-plate-hint]` placeholder; this helper fills it with textContent.
// =============================================================================

import { plateHint } from './plates.js';

function rowWeight(row) {
  const input = row?.querySelector?.('.input-weight-node');
  const raw = String(input?.value || '').trim() || String(input?.getAttribute?.('placeholder') || '').trim();
  const value = parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Fill one row's per-side plate line and the load change since the previous
 * row. Pure DOM text (never innerHTML). The weight is the entered value or the
 * visible ghost target, so the line is useful before the set is ticked.
 *
 * @param {any} row .cockpit-set-row
 * @param {{ unit?: 'kg'|'lbs', setup?: any }} [options]
 * @returns {boolean} true when a line was shown
 */
export function refreshSetPlateLine(row, options = {}) {
  const host = row?.querySelector?.('[data-set-plate]');
  if (!host) return false;
  const weight = rowWeight(row);
  if (!(weight > 0)) {
    host.textContent = '';
    host.hidden = true;
    return false;
  }
  const hint = plateHint(weight, options.unit || 'kg', options.setup || null);
  if (!hint) {
    host.textContent = '';
    host.hidden = true;
    return false;
  }
  const rows = row.parentElement
    ? [...row.parentElement.querySelectorAll('.cockpit-set-row')]
    : [];
  const index = rows.indexOf(row);
  const previous = index > 0 ? rowWeight(rows[index - 1]) : 0;
  const delta = previous > 0 ? Math.round((weight - previous) * 100) / 100 : 0;
  const unit = options.unit || 'kg';
  host.textContent = delta === 0
    ? hint
    : `${hint} · ${delta > 0 ? '+' : ''}${delta}${unit}`;
  host.hidden = false;
  return true;
}

/**
 * Refresh every set row in one exercise card. Called after render and after a
 * weight edit so the line and the delta track the visible inputs.
 * @param {any} root
 * @param {{ unit?: 'kg'|'lbs', setup?: any }} [options]
 */
export function refreshCardSetPlateLines(root, options = {}) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;
  let shown = 0;
  root.querySelectorAll('.cockpit-set-row').forEach((row) => {
    if (refreshSetPlateLine(row, options)) shown++;
  });
  return shown;
}

/**
 * @param {any} root element that contains the placeholder (the exercise card)
 * @param {string} text per-side hint, e.g. "20 + 20 / side"
 * @returns {boolean} true when a placeholder was filled
 */
export function applyPlateHint(root, text) {
  if (!root || typeof root.querySelector !== 'function') return false;
  const node = root.querySelector('[data-plate-hint]');
  if (!node) return false;
  const value = String(text == null ? '' : text);
  node.textContent = value;
  node.hidden = value === '';
  return value !== '';
}
