// =============================================================================
// OPEN GYM PLAN LOGGER CHECK
// Seeds an imported openGym plan, starts Monday's session and proves the cockpit
// uses the per-exercise target and starting weight instead of the shared week.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';
import { parseOpenGymPlan, createOpenGymProgram } from '../js/programs/opengym-plan.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await resolveChromium();
if (!runtime) process.exit(process.argv.includes('--required') ? 1 : 0);
const { chromium, executablePath } = runtime;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const source = {
  opengym_plan: 1, name: 'OpenGym test', unit: 'kg',
  week: { 1: ['upper'] },
  routines: [{ id: 'upper', name: 'Upper A', ex: [
    { id: '0289', sets: 3, reps: 12, weight: 30 },
    { id: '0314', sets: 3, reps: 10, weight: 30, restSec: 120 },
  ] }],
  customEx: [],
};
const program = createOpenGymProgram(parseOpenGymPlan(JSON.stringify(source)), { unit: 'kg' });
program.id = 'prog_opengym_browser';

const state = {
  schemaVersion: 12, currentWeek: '1', activeProgramId: program.id, activeActivationId: 'act_og',
  weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_og', programId: program.id, startWeek: 1, status: 'active', startedAt: '2026-11-16' }],
  settings: {
    name: 'Browser', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
  },
  customPrograms: [program],
  weeks: { '1': { activationId: 'act_og', programId: program.id, dates: {}, lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {} } },
  bodyWeightLog: [], wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney' });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-16T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('#homeWeekDays .home-week-day').length === 7);
  ok(/Upper A/.test(await page.locator('#homeTodayCard').innerText()), 'the openGym routine is todays session');
  await page.click('#homePrimaryCta');
  await page.waitForSelector('#view-workout.active');
  const card = page.locator('.cockpit-exercise[data-liftname="Dumbbell Incline Bench Press"]');
  await card.waitFor();
  ok((await card.locator('.cockpit-ex-target').innerText()) === 'Target: 3 × 10', 'the cockpit uses the per-exercise target');
  ok((await card.locator('.cockpit-set-row').count()) === 3, 'the cockpit materialises the per-exercise set count');
  ok((await card.locator('input.input-weight-node').first().getAttribute('placeholder')) === '30', 'the starting weight is offered as a ghost');
  ok((await card.locator('input.input-reps-node').first().getAttribute('placeholder')) === '10', 'the target reps are offered as a ghost');
  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`\nopengym-plan-browser-check: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nopengym-plan-browser-check: PASS — openGym target and starting weight reach the cockpit.');
