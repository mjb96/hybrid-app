// @ts-check
import { clearRunSessions, runSessionsForDay, upsertRunSession } from '../state/run-sessions.js';

function clone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function snapshotRunActivity(week, day, sessionId) {
  const run = runSessionsForDay(week, day).find((entry) => entry?.sessionId === sessionId);
  return run ? clone(run) : null;
}

export function deleteRunActivity(week, day, sessionId) {
  if (!sessionId) return null;
  const snapshot = snapshotRunActivity(week, day, sessionId);
  if (!snapshot) return null;
  clearRunSessions(week, day, sessionId);
  return snapshot;
}

export function restoreRunActivity(week, day, snapshot) {
  if (!snapshot?.sessionId) return false;
  upsertRunSession(week, day, snapshot, {
    sessionId: snapshot.sessionId,
    source: snapshot.source,
    localDate: snapshot.localDate,
    startTs: snapshot.startTs,
    updatedTs: snapshot.updatedTs,
  });
  return true;
}

export function snapshotStrengthActivity(week, day) {
  if (!week || !day) return null;
  return clone({
    lifts: week.lifts?.[day] || {},
    liftOrder: week.liftOrder?.[day] || [],
    liftMeta: week.liftMeta?.[day] || {},
    notes: week.notes?.[day] || '',
    gymRpe: week.gymRpe?.[day] || '',
    gymStats: week.gymStats?.[day] || {},
    // Lifecycle sidecars are part of the session, not scaffolding. Deleting
    // without these left a finished workout "finished" for Home/adherence, and
    // Undo could not bring the lifecycle back.
    sessionStatus: week.sessionStatus?.[day] ?? null,
    sessionSummary: week.sessionSummary?.[day] ?? null,
  });
}

export function deleteStrengthActivity(week, day, replacement = {}) {
  const snapshot = snapshotStrengthActivity(week, day);
  if (!snapshot) return null;
  if (!week.lifts) week.lifts = {};
  if (!week.liftOrder) week.liftOrder = {};
  if (!week.liftMeta) week.liftMeta = {};
  if (!week.notes) week.notes = {};
  if (!week.gymRpe) week.gymRpe = {};
  if (!week.gymStats) week.gymStats = {};
  week.lifts[day] = clone(replacement.lifts || {});
  week.liftOrder[day] = clone(replacement.liftOrder || []);
  week.liftMeta[day] = {};
  week.notes[day] = '';
  week.gymRpe[day] = '';
  week.gymStats[day] = { time: '', avgHR: '', maxHR: '', cals: '' };
  if (week.sessionStatus) delete week.sessionStatus[day];
  if (week.sessionSummary) delete week.sessionSummary[day];
  return snapshot;
}

export function restoreStrengthActivity(week, day, snapshot) {
  if (!week || !day || !snapshot) return false;
  if (!week.lifts) week.lifts = {};
  if (!week.liftOrder) week.liftOrder = {};
  if (!week.liftMeta) week.liftMeta = {};
  if (!week.notes) week.notes = {};
  if (!week.gymRpe) week.gymRpe = {};
  if (!week.gymStats) week.gymStats = {};
  week.lifts[day] = clone(snapshot.lifts || {});
  week.liftOrder[day] = clone(snapshot.liftOrder || []);
  week.liftMeta[day] = clone(snapshot.liftMeta || {});
  week.notes[day] = snapshot.notes || '';
  week.gymRpe[day] = snapshot.gymRpe || '';
  week.gymStats[day] = clone(snapshot.gymStats || {});
  if (snapshot.sessionStatus != null) {
    if (!week.sessionStatus) week.sessionStatus = {};
    week.sessionStatus[day] = clone(snapshot.sessionStatus);
  } else if (week.sessionStatus) {
    delete week.sessionStatus[day];
  }
  if (snapshot.sessionSummary != null) {
    if (!week.sessionSummary) week.sessionSummary = {};
    week.sessionSummary[day] = clone(snapshot.sessionSummary);
  } else if (week.sessionSummary) {
    delete week.sessionSummary[day];
  }
  return true;
}
