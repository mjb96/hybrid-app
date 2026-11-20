import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyReview, reviewToText, pickWeeklyFocus } from '../js/brain/weekly-review.js';
import { addDaysISO } from '../js/analytics/weekly-aggregate.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TODAY = '2026-11-20'; // Friday
const W1 = '2026-11-02';
const W2 = '2026-11-09';
const W3 = '2026-11-16';

function weekData(startMonday, weight, dist) {
  const mon = startMonday;
  const wed = addDaysISO(startMonday, 2);
  return {
    lifts: {
      mon: {
        'Back Squat': [
          { w: String(weight), r: 5, c: true },
          { w: String(weight), r: 5, c: true },
        ],
      },
    },
    runs: {},
    runSessions: {
      wed: [{
        sessionId: `run-${startMonday}`,
        dist: String(dist),
        time: '25:00',
        rpe: '6',
        localDate: wed,
        source: 'gps',
      }],
    },
    gymRpe: { mon: '7' },
    gymStats: { mon: { time: '45:00' } },
    dates: { mon, wed },
    sessionStatus: { mon: 'finished' },
  };
}

function makeState() {
  return {
    currentWeek: '3',
    weekStartedAt: W3,
    settings: { fitnessLevel: 'intermediate' },
    weeks: {
      '1': weekData(W1, 100, 5),
      '2': weekData(W2, 105, 6),
      '3': weekData(W3, 110, 7),
    },
    loadMetrics: { atl: 9, ctl: 10 },
    hybridScore: {
      xp: 900, lastRecordedDate: TODAY,
      history: [
        { date: '2026-11-15', score: 72, level: 2 },
        { date: '2026-11-18', score: 78, level: 2 },
        { date: TODAY, score: 84, level: 2 },
      ],
    },
  };
}
const PROGRAM = { totalWeeks: 12, days: { mon: { title: 'Squat', runs: 'Rest', lifts: [{ name: 'Back Squat' }] }, wed: { title: 'Run', runs: '5k easy' } } };

test('buildWeeklyReview: calendar totals, PR detection, score arc', () => {
  const r = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: TODAY });
  assert.equal(r.hasData, true);
  assert.equal(r.wkNum, 3);
  assert.equal(r.totals.sessions, 2);                 // mon lift + wed run
  assert.equal(r.totals.volume, 110 * 5 * 2);         // 2×5 @ 110
  assert.equal(r.totals.distanceKm, 7);
  // Week 3 squat e1RM beats weeks 1–2 → PR
  assert.equal(r.prs.length, 1);
  assert.equal(r.prs[0].lift, 'Back Squat');
  // Arc across the recorded week: 72 → 84
  assert.equal(r.arc.hasData, true);
  assert.equal(r.arc.delta, 12);
  assert.ok(r.focus.area.length > 0);
  assert.equal(r.isCurrentWeek, true);
  assert.equal(r.label, 'This week');
});

test('buildWeeklyReview: imported archived weeks are this week when their DATE says so', () => {
  const state = {
    currentWeek: '1',
    settings: { fitnessLevel: 'intermediate' },
    weeks: {
      '1': { dates: {}, lifts: {}, runs: {}, runSessions: {}, gymStats: {}, sessionStatus: {} },
      'arch:import:prev': {
        ...weekData(W2, 100, 5),
        activationId: 'imported', programId: 'imported', sessionId: 'og_prev',
        sessionTitle: 'Imported Push', source: 'csv-import',
      },
      'arch:import:this': {
        ...weekData(W3, 120, 8),
        activationId: 'imported', programId: 'imported', sessionId: 'og_this',
        sessionTitle: 'Imported Push', source: 'csv-import',
      },
    },
  };
  const r = buildWeeklyReview(state, DAYS, null, { today: TODAY });
  assert.equal(r.totals.sessions, 2);
  assert.equal(r.totals.volume, 120 * 5 * 2);
  assert.equal(r.totals.distanceKm, 8);
  assert.equal(r.totals.sets, 2);
  assert.equal(r.prs.length, 1);
  assert.equal(r.prs[0].lift, 'Back Squat');
  assert.match(reviewToText(r), /This week on openHybrid: 1,200 kg lifted · 8 km run · 2 sessions · 1 PR/);
});

test('buildWeeklyReview: a frozen program week is not this calendar week', () => {
  const state = {
    currentWeek: '3',
    settings: {},
    weeks: {
      // currentWeek still points at week 3, but its dates are LAST week.
      '3': weekData(W2, 110, 7),
    },
  };
  const r = buildWeeklyReview(state, DAYS, null, { today: TODAY });
  assert.equal(r.totals.sessions, 0);
  assert.equal(r.totals.volume, 0);
  assert.equal(r.totals.distanceKm, 0);
  assert.equal(r.hasData, false);
});

test('buildWeeklyReview: empty week degrades honestly', () => {
  const r = buildWeeklyReview({ currentWeek: '1', settings: {}, weeks: {} }, DAYS, null, { today: TODAY });
  assert.equal(r.hasData, false);
  assert.match(reviewToText(r), /no sessions logged/);
});

test('pickWeeklyFocus: priority order', () => {
  assert.equal(pickWeeklyFocus({ consistencyPct: 50, hasPlan: true, acwr: 1.5, distance: 0, volumeDeltaPct: -20 }).area, 'Consistency');
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 1.5, distance: 0, volumeDeltaPct: -20 }).area, 'Recovery');
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 0.9, distance: 0, volumeDeltaPct: -20 }).area, 'Endurance');
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 0.9, distance: 10, volumeDeltaPct: -20 }).area, 'Strength');
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 0.9, distance: 10, volumeDeltaPct: 5 }).area, 'Momentum');
});

test('pickWeeklyFocus: a deload week overrides the volume-dip / momentum praise', () => {
  // Lower volume on a deload would otherwise read as "volume dipped, rebuild" —
  // the deload branch pre-empts it so the review agrees with the coach.
  const f = pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 0.9, distance: 10, volumeDeltaPct: -20, isDeload: true });
  assert.equal(f.area, 'Deload');
  assert.doesNotMatch(f.text, /progressive overload|rebuild/i);
  // But a genuine safety flag (hot load) still wins over the deload framing.
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 1.5, distance: 10, volumeDeltaPct: -20, isDeload: true }).area, 'Recovery');
});

test('reviewToText: numbers-first share copy with unit conversion', () => {
  const r = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: TODAY });
  const txt = reviewToText(r, 'km');
  assert.match(txt, /This week on openHybrid: 1,100 kg lifted · 7 km run · 2 sessions · 1 PR 🏆\./);
  assert.match(txt, /Hybrid Score 84 \(\+12 this week\)/);
  assert.match(txt, /Next week's focus — /);
  assert.match(reviewToText(r, 'mi'), /4\.3 mi run/);
});
