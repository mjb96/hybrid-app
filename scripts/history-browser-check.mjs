// Real-browser regression for the History screen: imported titles/provenance,
// search, Calendar | List, same-day sessions and the no-route state.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await resolveChromium();
if (!runtime) process.exit(0);
const { chromium, executablePath } = runtime;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'index.html';
    const bytes = await readFile(path.join(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${server.address().port}/index.html`;

const rest = { title: 'Rest', desc: '', runs: 'Rest', lifts: [] };
const days = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => [day, { ...rest }]));
days.mon = { title: 'Lower A', desc: 'Back Squat', runs: 'Rest', lifts: ['Back Squat'] };
days.tue = { title: 'Tempo Run', desc: '', runs: '5 km', lifts: [] };
const program = {
  id: 'history_program', name: 'History Test', totalWeeks: 4, days,
  weeklyVolModifiers: Object.fromEntries(['1', '2', '3', '4'].map((week) => [week, { sets: 3, reps: 5 }])),
};

const state = {
  schemaVersion: 12,
  currentWeek: '1',
  activeProgramId: program.id,
  activeActivationId: 'act_history',
  customPrograms: [program],
  customExercises: [],
  settings: {
    name: 'Athlete', onboardingComplete: true, theme: 'dark',
    weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon',
  },
  bodyWeightLog: [],
  weeks: {
    '1': {
      activationId: 'act_history', programId: program.id,
      dates: {}, lifts: { mon: { 'Back Squat': [{ w: '', r: '', c: false }] } },
      liftOrder: { mon: ['Back Squat'] }, runs: {}, runSessions: {}, notes: {}, gymRpe: {}, gymStats: {}, sessionStatus: {},
    },
    'arch:import:lower': {
      activationId: 'imported', programId: 'imported', sessionId: 'og_lower',
      sessionTitle: 'Imported Lower', source: 'csv-import',
      dates: { mon: '2026-11-16' },
      lifts: { mon: { 'Back Squat': [{ w: '100', r: '5', c: true }, { w: '100', r: '5', c: true }] } },
      sessionStatus: { mon: 'finished' }, gymStats: { mon: { time: '45:00' } },
      runs: {}, runSessions: {}, notes: { mon: 'Good session' }, gymRpe: { mon: '' },
    },
    'arch:import:treadmill': {
      activationId: 'imported', programId: 'imported', sessionId: 'og_treadmill',
      sessionTitle: 'Treadmill', source: 'csv-import',
      dates: { tue: '2026-11-17' },
      lifts: { tue: {} },
      runSessions: { tue: [{ sessionId: 'run_treadmill', source: 'csv-import', localDate: '2026-11-17', dist: '5', time: '25:00' }] },
      runs: {}, notes: { tue: 'Windy' }, gymRpe: { tue: '' }, gymStats: { tue: {} },
    },
    'arch:import:same-day': {
      activationId: 'imported', programId: 'imported', sessionId: 'og_same',
      sessionTitle: 'Push A', source: 'csv-import',
      dates: { wed: '2026-11-04' },
      lifts: { wed: { 'Bench Press': [{ w: '80', r: '8', c: true }] } },
      sessionStatus: { wed: 'finished' }, gymStats: { wed: { time: '50:00' } },
      runSessions: { wed: [{ sessionId: 'run_same', source: 'gps', localDate: '2026-11-04', dist: '6', time: '30:00', pace: '5:00' }] },
      runs: {}, notes: { wed: '' }, gymRpe: { wed: '' },
    },
  },
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

try {
  const context = await createBrowserContext(browser, {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await context.addInitScript((seed) => {
    localStorage.setItem('hybrid_engine_v2_state', JSON.stringify(seed));
  }, state);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('#homeQuickActions [data-action="open-activities"]');
  await page.click('#homeQuickActions [data-action="open-activities"]');
  await page.waitForSelector('#activitiesScreen:not([style*="display: none"])');
  await page.waitForSelector('.activity-history-row');

  check((await page.locator('#activitiesTitle').textContent()) === 'History', 'screen is not titled History');
  const titles = await page.locator('.activity-history-title').allTextContents();
  check(titles.some((t) => t.includes('Imported Lower')), 'imported strength title is not resolved');
  check(titles.some((t) => t.includes('Treadmill')), 'imported run title is missing');
  check((await page.locator('.activity-source-badge').count()) >= 2, 'import provenance badges are missing');

  await page.fill('#historySearchInput', 'Treadmill');
  await page.waitForFunction(() => document.querySelectorAll('.activity-history-row').length === 1);
  check((await page.locator('.activity-history-row').count()) === 1, 'search did not narrow to the treadmill run');
  await page.fill('#historySearchInput', '');
  await page.waitForFunction(() => document.querySelectorAll('.activity-history-row').length >= 3);

  await page.click('[data-action="set-history-view"][data-view="calendar"]');
  await page.waitForSelector('.history-calendar-grid');
  check((await page.locator('.cal-has-activity').count()) >= 3, 'calendar does not mark imported training days');
  await page.click('[data-action="history-calendar-day"][data-date="2026-11-04"]');
  await page.waitForFunction(() => {
    const input = document.getElementById('historySearchInput');
    return input && document.querySelectorAll('.activity-history-row').length === 2;
  });
  check((await page.locator('.activity-history-row').count()) === 2, 'same-day sessions did not both survive the day filter');

  await page.click('[data-action="clear-activity-date"]');
  await page.waitForFunction(() => document.querySelectorAll('.activity-history-row').length >= 3);
  await page.click('.activity-history-row:has-text("Treadmill")');
  await page.waitForSelector('.recap-no-route');
  check((await page.locator('.recap-no-route').textContent()).includes('No GPS route'), 'missing-route copy is not shown');
  check((await page.locator('.activity-detail-source').textContent()).includes('Imported from CSV'), 'detail provenance is missing');

  // Repeat a stored strength workout: History closes, a blank one-off copy opens
  // in the cockpit, and the logged sets are not re-completed in the copy.
  await page.click('#activitiesBack');
  await page.fill('#historySearchInput', 'Imported Lower');
  await page.waitForFunction(() => document.querySelectorAll('.activity-history-row').length === 1);
  await page.click('.activity-history-row:has-text("Imported Lower")');
  await page.waitForSelector('.activity-repeat');
  await page.click('.activity-repeat');
  await page.waitForSelector('#trainCockpit:not([hidden])');
  const copied = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
    const key = s.activeStrengthSessionKey;
    const week = key ? s.weeks?.[key] : null;
    const sets = week?.lifts?.[week?.sessionDay]?.['Back Squat'] || [];
    return {
      kind: week?.sessionKind || '',
      title: week?.sessionTitle || '',
      sets: sets.length,
      done: sets.filter((set) => set && set.c).length,
      historyOpen: document.getElementById('activitiesScreen')?.style.display !== 'none',
    };
  });
  check(copied.kind === 'copy', 'Repeat did not create a copied session');
  check(/Imported Lower/.test(copied.title), 'The copied session lost its source title');
  check(copied.sets === 2, 'The copied session lost its exercises/sets');
  check(copied.done === 0, 'The copied session started with completed sets');
  check(copied.historyOpen === false, 'History stayed open over the repeated workout');

  check(errors.length === 0, `page errors: ${errors.join(' | ')}`);
  if (failures.length) {
    console.error('History browser check failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('History browser check passed.');
  }
} finally {
  await browser.close();
  server.close();
}
