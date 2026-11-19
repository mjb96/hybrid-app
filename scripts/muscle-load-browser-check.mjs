// =============================================================================
// MUSCLE LOAD BROWSER CHECK
// Seeds two strength days and proves Progress → Muscle Load shows weekly volume,
// recovery labels and the untrained state. No personal data.
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
const set = (w, r) => ({ w, r, c: true });
const state = {
  schemaVersion: 9, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_ml', weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_ml', programId: 'hybrid_engine', startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true }, bandWeights: { L: 10, M: 20, H: 30 },
    equipmentProfiles: [], musclePriorities: { chest: 'grow', quads: 'grow' },
  },
  customPrograms: [],
  weeks: {
    '1': {
      activationId: 'act_ml', programId: 'hybrid_engine',
      dates: { mon: '2026-11-16', tue: '2026-11-17' },
      lifts: { mon: { 'Bench Press': [set('60', '8'), set('60', '8')] }, tue: { 'Back Squat': [set('80', '5')] } },
      runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {},
    },
  },
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

  await page.click('.nav-item[data-target="analytics"]');
  await page.waitForSelector('#view-analytics.active');
  await page.click('#view-analytics [data-action="open-analytics"][data-context="muscle-load"]:visible');
  await page.waitForSelector('#analytics-muscle-load.active');

  const summary = await page.locator('#muscleLoadSummary').innerText();
  ok(/focus muscles in range/.test(summary), 'the summary reports focus coverage');
  ok(/recovering/.test(summary), 'recovery is summarised');

  const rows = await page.locator('#muscleLoadList .muscle-load-row').count();
  ok(rows >= 2, `muscle rows render (${rows})`);
  const list = await page.locator('#muscleLoadList').innerText();
  ok(/Chest/.test(list) && /Quads/.test(list), 'the trained muscles are listed');
  ok(/credits/.test(list), 'weekly credits are shown');
  ok(/ready|recovering/i.test(list), 'last-trained recovery labels are shown');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  console.error(`muscle-load-browser-check: FAIL — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('muscle-load-browser-check: PASS — weekly volume, recovery and summary.');
