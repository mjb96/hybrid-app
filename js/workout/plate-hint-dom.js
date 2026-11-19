// @ts-check
// =============================================================================
// PLATE HINT DOM (js/workout/plate-hint-dom.js)
//
// The per-side hint is athlete-configured text. It must never be interpolated
// into an HTML string, even escaped, because that keeps a DOM-text → innerHTML
// path alive for static analysis. buildExerciseCard renders an empty
// `[data-plate-hint]` placeholder; this helper fills it with textContent.
// =============================================================================

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
