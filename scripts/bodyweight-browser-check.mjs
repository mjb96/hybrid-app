// =============================================================================
// BODY WEIGHT BROWSER CHECK
// Seeds three weeks of weigh-ins plus a goal/corridor, then proves the Progress
// graph, weekly rate, range filter, weigh-in entry and goal editor work in the
// real app. No personal data.
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
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const todayISO = '2026-11-19';
const state = {
  schemaVersion: 8, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_bw', weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_bw', programId: 'hybrid_engine', startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
    targetWeight: 80, rateGoal: { dir: 'lose', by: '%', lo: 0.5, hi: 1 },
  },
  customPrograms: [],
  weeks: { '1': {
    activationId: 'act_bw', programId: 'hybrid_engine',
    dates: {}, lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {},
  } },
  bodyWeightLog: [
    { date: '2026-10-30', weight: 88.2 }, { date: '2026-11-02', weight: 87.8 },
    { date: '2026-11-05', weight: 87.5 }, { date: '2026-11-08', weight: 87.1 },
    { date: '2026-11-11', weight: 86.8 }, { date: '2026-11-14', weight: 86.4 },
    { date: '2026-11-17', weight: 86.1 }, { date: '2026-11-19', weight: 85.9 },
  ],
  wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
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
  await page.waitForSelector('#homeBodyweightCard .home-bw__spark');
  ok(/85\.9 kg/.test(await page.locator('#homeBodyweightCard').innerText()), 'Home shows the latest weigh-in');
  await page.click('#homeBodyweightCard [data-action="open-bw-sheet"]');
  await page.waitForSelector('#bwSheet.active');
  ok((await page.locator('#bwSheetWeight').inputValue()) === '85.9', 'Home Log opens the prefilled sheet');
  await page.click('#bwSheet .sheet-close-btn');
  await page.waitForFunction(() => !document.getElementById('bwSheet')?.classList.contains('active'));

  await page.click('.nav-item[data-target="analytics"]');
  await page.waitForSelector('#view-analytics.active');
  await page.click('#view-analytics [data-action="open-analytics"][data-context="bodyweight"]:visible');
  await page.waitForSelector('#analytics-bodyweight.active');
  await page.waitForSelector('#bwChartContainer svg');

  const chart = await page.locator('#bwChartContainer').innerHTML();
  ok(/Goal 80 kg/.test(chart), 'the graph draws the goal line');
  ok(/7d avg/.test(chart), 'the graph draws the 7-day average');
  ok((chart.match(/<circle /g) || []).length >= 8, 'every weigh-in has a dot');

  const summary = await page.locator('#bwSummary').innerText();
  ok(/Trend/.test(summary), 'the weekly trend is shown');
  ok(/On pace/.test(summary), 'the rate corridor reports on pace');
  ok(/7-day average/.test(summary), 'the 7-day average is summarised');

  ok((await page.locator('#bwWeeklyStats .bw-week-row').count()) >= 3, 'weekly averages are listed');

  await page.click('[data-action="bw-range"][data-days="30"]');
  await page.waitForFunction(() => document.querySelector('[data-action="bw-range"][data-days="30"]')?.classList.contains('active'));
  ok(await page.locator('[data-action="bw-range"][data-days="30"]').evaluate((el) => el.classList.contains('active')), 'the 30-day range selects');

  ok(/Last 85\.9 kg/.test(await page.locator('#bwLastHint').innerText()), 'the log button shows the last weight');

  await page.click('#analytics-bodyweight [data-action="open-bw-sheet"]');
  await page.waitForSelector('#bwSheet.active');
  ok((await page.locator('#bwSheetWeight').inputValue()) === '85.9', 'the sheet prefills the last weight');
  ok((await page.locator('#bwSheetDate').inputValue()) === '2026-11-19', 'the sheet opens on today');
  await page.click('[data-action="bw-step"][data-delta="-0.1"]');
  ok((await page.locator('#bwSheetWeight').inputValue()) === '85.8', 'the stepper adjusts by 0.1');
  await page.click('[data-action="save-bw-sheet"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyWeightLog?.find((entry) => entry.date === '2026-11-19');
    return Number(day?.weight) === 85.8;
  }, STORAGE_KEY);
  ok(/85\.8 kg/.test(await page.locator('#bwSummary').innerText()), 'saving updates the latest weight');
  await page.waitForFunction(() => !document.getElementById('bwSheet')?.classList.contains('active'));

  await page.click('#analytics-bodyweight [data-action="open-bw-sheet"]');
  await page.waitForSelector('#bwSheet.active');
  ok((await page.locator('#bwSheetRecent .bw-sheet-recent-row').count()) >= 1, 'recent weigh-ins are one tap away');
  const deleteDate = await page.locator('[data-action="delete-bw-row"]').first().getAttribute('data-date');
  await page.click('[data-action="delete-bw-row"]');
  await page.waitForSelector('.cmodal [data-cm="ok"]');
  await page.click('.cmodal [data-cm="ok"]');
  await page.waitForFunction(([key, date]) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return !stored.bodyWeightLog?.some((entry) => entry.date === date);
  }, [STORAGE_KEY, deleteDate]);
  ok(true, 'delete removes a recent weigh-in');
  await page.waitForFunction(() => !document.getElementById('bwSheet')?.classList.contains('active'));

  await page.click('.bw-goal-editor summary');
  await page.fill('#bwGoalWeight', '79');
  await page.click('[data-action="save-bw-goal"]');
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}')?.settings?.targetWeight === 79, STORAGE_KEY);
  ok(/Goal 79 kg/.test(await page.locator('#bwChartContainer').innerHTML()), 'the goal weight updates the graph');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  console.error(`bodyweight-browser-check: FAIL — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('bodyweight-browser-check: PASS — graph, goal line, weekly rate, range and entry.');
