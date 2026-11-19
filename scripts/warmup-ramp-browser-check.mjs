// =============================================================================
// WARM-UP RAMP BROWSER CHECK
// Proves the opt-in ramp actually inserts editable warm-up rows in the cockpit
// after the first working weight, and does not duplicate them.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

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
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const todayISO = '2026-11-19';
const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const program = {
  id: 'prog_warmup', name: 'Warm-up Test', totalWeeks: 4,
  days: Object.fromEntries(days.map((day) => [day, { title: day, lifts: ['Back Squat'], runs: 'Rest' }])),
};
const state = {
  schemaVersion: 9, currentWeek: '1', activeProgramId: program.id, activeActivationId: 'act_warm', weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_warm', programId: program.id, startWeek: 1, status: 'active', startedAt: todayISO }],
  settings: {
    name: 'Browser', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    autoWarmupRamp: true,
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 },
    equipmentProfiles: [{
      id: 'eqp', name: 'Gym', equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
      bandWeights: { L: 10, M: 20, H: 30 },
      plateSetup: { kg: { bar: 20, plates: [25, 20, 15, 10, 5, 2.5], counts: {} }, lb: { bar: 45, plates: [45, 35, 25, 10, 5], counts: {} } },
    }],
    activeEquipmentProfileId: 'eqp',
  },
  customPrograms: [program],
  weeks: { '1': { activationId: 'act_warm', programId: program.id, dates: {}, lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {} } },
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
  await context.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#homeWeekStrip');

  await page.click('.nav-item[data-target="workout"]');
  await page.waitForSelector('#trainLanding [data-action="qs-workout"]');
  await page.click('#trainLanding [data-action="qs-workout"]');
  await page.waitForSelector('#trainCockpit:not([hidden])');
  await page.waitForSelector('#cockpitExercisesContainer .cockpit-exercise');

  const firstWeight = page.locator('.cockpit-exercise .input-weight-node').first();
  await firstWeight.fill('100');
  await firstWeight.press('Tab');
  await page.waitForFunction(() => document.querySelectorAll('.cockpit-exercise .type-warmup').length >= 3);

  const warmups = await page.locator('.cockpit-exercise .type-warmup').count();
  ok(warmups >= 3, `three warm-up rows appear (${warmups})`);
  const warmupText = await page.locator('.cockpit-exercise .type-warmup').first().innerText();
  ok(/W/.test(warmupText), 'the rows are marked as warm-ups');

  // Editing again must not duplicate the ladder.
  await firstWeight.fill('105');
  await firstWeight.press('Tab');
  await page.waitForTimeout(250);
  ok((await page.locator('.cockpit-exercise .type-warmup').count()) === warmups, 'editing the weight does not add a second ladder');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  console.error(`warmup-ramp-browser-check: FAIL — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('warmup-ramp-browser-check: PASS — opt-in ramp inserts once.');
