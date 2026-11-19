// @ts-check
// =============================================================================
// EDIT A SAVED ACTIVITY (js/workout/edit-saved.js)
//
// A finished workout is history, not a frozen screenshot: correcting a typo in
// weight, reps or a run's distance should not require deleting the session.
// This sheet edits the stored values in place and keeps the same identity, date,
// activation and route. Exercise names/add/remove stay out of scope.
// =============================================================================
import { isCompletedSet } from '../set-utils.js';
import { runSessionsForDay, upsertRunSession } from '../state/run-sessions.js';
import { openManagedModal, closeManagedModal } from '../ui/modal-stack.js';

const esc = (value) => String(value == null ? '' : value).replace(/[&<>"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
}[char]));

let _ctx = null;

/** Update one stored strength set. Returns false when the target is gone. */
export function updateStrengthSet(week, day, lift, index, { w, r }) {
  const sets = week?.lifts?.[day]?.[lift];
  if (!Array.isArray(sets) || !sets[index]) return false;
  const nextW = String(w ?? '').trim();
  const nextR = String(r ?? '').trim();
  sets[index] = { ...sets[index], w: nextW, r: nextR };
  return true;
}

function paceFrom(dist, time) {
  const km = parseFloat(dist);
  const match = String(time || '').match(/^(\d+):([0-5]\d)$/);
  if (!(km > 0) || !match) return '';
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  const perKm = Math.round(seconds / km);
  return `${Math.floor(perKm / 60)}:${String(perKm % 60).padStart(2, '0')}`;
}

/** Update the run session's stored fields, preserving its identity and route. */
export function updateSavedRun(week, day, sessionId, fields) {
  const list = runSessionsForDay(week, day);
  const current = list.find((run) => run.sessionId === sessionId) || list[0] || week?.runs?.[day];
  if (!current) return false;
  const next = {
    ...current,
    dist: String(fields.dist ?? current.dist ?? '').trim(),
    time: String(fields.time ?? current.time ?? '').trim(),
    avgHR: String(fields.avgHR ?? current.avgHR ?? '').trim(),
    maxHR: String(fields.maxHR ?? current.maxHR ?? '').trim(),
    notes: String(fields.notes ?? current.notes ?? '').trim(),
  };
  next.pace = paceFrom(next.dist, next.time) || current.pace || '';
  upsertRunSession(week, day, next, {
    sessionId: current.sessionId || sessionId,
    source: current.source || 'manual',
    localDate: current.localDate || week?.dates?.[day] || null,
    startTs: current.startTs,
  });
  return true;
}

function strengthBody(week, day) {
  const lifts = week?.lifts?.[day] || {};
  const rows = [];
  for (const [lift, sets] of Object.entries(lifts)) {
    if (!Array.isArray(sets) || !sets.length) continue;
    const visible = sets.map((set, index) => ({ set, index })).filter(({ set }) => isCompletedSet(set) || set?.type === 'W');
    if (!visible.length) continue;
    rows.push(`<section class="edit-saved-group">
      <h4>${esc(lift)}</h4>
      ${visible.map(({ set, index }) => `<div class="edit-saved-set" data-edit-set>
        <span class="edit-saved-set__n">${index + 1}${set.type ? ` · ${esc(set.type)}` : ''}</span>
        <label><span>${esc('Weight')}</span><input type="number" inputmode="decimal" step="0.5" min="0" data-edit-lift="${esc(lift)}" data-edit-index="${index}" data-edit-field="w" value="${esc(set.w ?? '')}"></label>
        <label><span>Reps</span><input type="number" inputmode="numeric" step="1" min="0" data-edit-lift="${esc(lift)}" data-edit-index="${index}" data-edit-field="r" value="${esc(set.r ?? '')}"></label>
      </div>`).join('')}
    </section>`);
  }
  const notes = week?.notes?.[day] || '';
  return rows.length
    ? `${rows.join('')}<label class="edit-saved-notes"><span>Session notes</span><textarea id="editSavedNotes" rows="3">${esc(notes)}</textarea></label>`
    : '<p class="edit-saved-empty">No completed sets are stored for this workout.</p>';
}

function runBody(week, day, sessionId) {
  const list = runSessionsForDay(week, day);
  const run = list.find((entry) => entry.sessionId === sessionId) || list[0] || week?.runs?.[day] || {};
  return `<div class="edit-saved-run">
    <label><span>Distance (km)</span><input type="number" inputmode="decimal" step="0.01" min="0" id="editRunDist" value="${esc(run.dist ?? '')}"></label>
    <label><span>Duration (M:SS)</span><input type="text" inputmode="numeric" id="editRunTime" maxlength="6" value="${esc(run.time ?? '')}"></label>
    <label><span>Avg HR</span><input type="number" inputmode="numeric" min="0" max="260" id="editRunAvgHR" value="${esc(run.avgHR ?? '')}"></label>
    <label><span>Max HR</span><input type="number" inputmode="numeric" min="0" max="260" id="editRunMaxHR" value="${esc(run.maxHR ?? '')}"></label>
    <label class="edit-saved-notes"><span>Notes</span><textarea id="editRunNotes" rows="3">${esc(run.notes ?? '')}</textarea></label>
  </div>`;
}

/** @param {{state:any, weekKey:string, day:string, kind:'strength'|'run', sessionId?:string|null, save:Function, onSaved?:Function}} ctx */
export function openSavedWorkoutEditor(ctx) {
  const sheet = document.getElementById('editSavedSheet');
  const body = document.getElementById('editSavedBody');
  const title = document.getElementById('editSavedTitle');
  if (!sheet || !body || !ctx?.state) return;
  _ctx = ctx;
  if (title) title.textContent = ctx.kind === 'run' ? 'Edit run' : 'Edit workout';
  body.innerHTML = ctx.kind === 'run'
    ? runBody(ctx.state.weeks?.[ctx.weekKey], ctx.day, ctx.sessionId)
    : strengthBody(ctx.state.weeks?.[ctx.weekKey], ctx.day);
  sheet.classList.add('active');
  document.getElementById('editSavedBackdrop')?.classList.add('active');
  openManagedModal(sheet, { initialFocus: body.querySelector('input, textarea, button') });
}

export function closeSavedWorkoutEditor() {
  const sheet = document.getElementById('editSavedSheet');
  if (!sheet) return;
  sheet.classList.remove('active');
  document.getElementById('editSavedBackdrop')?.classList.remove('active');
  closeManagedModal(sheet);
  _ctx = null;
}

export async function saveSavedWorkoutEditor() {
  const ctx = _ctx;
  if (!ctx) return false;
  const week = ctx.state.weeks?.[ctx.weekKey];
  if (!week) { closeSavedWorkoutEditor(); return false; }
  let changed = false;
  if (ctx.kind === 'run') {
    const field = (id) => /** @type {HTMLInputElement|HTMLTextAreaElement|null} */ (document.getElementById(id))?.value;
    changed = updateSavedRun(week, ctx.day, ctx.sessionId, {
      dist: field('editRunDist'),
      time: field('editRunTime'),
      avgHR: field('editRunAvgHR'),
      maxHR: field('editRunMaxHR'),
      notes: field('editRunNotes'),
    });
  } else {
    document.querySelectorAll('#editSavedBody [data-edit-lift]').forEach((node) => {
      const input = /** @type {HTMLInputElement} */ (node);
      const lift = input.getAttribute('data-edit-lift');
      const index = Number(input.getAttribute('data-edit-index'));
      const field = input.getAttribute('data-edit-field');
      const set = week.lifts?.[ctx.day]?.[lift]?.[index];
      if (!set) return;
      const patch = { w: set.w, r: set.r };
      patch[field] = input.value;
      if (updateStrengthSet(week, ctx.day, lift, index, patch)) changed = true;
    });
    const notes = /** @type {HTMLTextAreaElement|null} */ (document.getElementById('editSavedNotes'))?.value;
    if (notes != null) { week.notes[ctx.day] = notes; changed = true; }
  }
  if (!changed) { closeSavedWorkoutEditor(); return false; }
  try { await Promise.resolve(ctx.save?.(true)); } catch { /* save reports its own failure */ }
  const onSaved = ctx.onSaved;
  closeSavedWorkoutEditor();
  onSaved?.();
  return true;
}
