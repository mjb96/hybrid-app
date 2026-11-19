// =============================================================================
// EDIT SAVED ACTIVITY BROWSER CHECK
// Opens a finished strength workout from History, corrects a set and proves the
// stored training record + recap both change without deleting the session.
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

const state = {
  schemaVersion: 12, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_edit',
  weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_edit', programId: 'hybrid_engine', startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
  },
  customPrograms: [],
  weeks: { '1': {
    activationId: 'act_edit', programId: 'hybrid_engine', sessionId: 'str_edit', sessionTitle: 'Push A',
    dates: { mon: '2026-11-16' }, lifts: { mon: { 'Bench Press': [{ w: '100', r: '5', c: true }, { w: '100', r: '5', c: true }] } },
    liftOrder: { mon: ['Bench Press'] }, liftMeta: { mon: {} }, notes: { mon: 'Original note' }, gymRpe: { mon: '' },
    bodyWeight: {}, gymStats: { mon: { time: '20:00', avgHR: '', maxHR: '', cals: '' } },
    sessionStatus: { mon: 'finished' }, sessionSummary: { mon: { plannedSets: 2, completedSets: 2, adherencePct: 100 } },
    runs: {}, runSessions: {},
  } },
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
  await context.addInitScript(pinClock, Date.parse('2026-11-20T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('#homeWeekDays .home-week-day').length === 7);
  await page.click('#homeQuickActions [data-action="open-activities"]');
  await page.waitForSelector('#activitiesScreen .activity-history-row--strength');
  await page.click('#activitiesScreen .activity-history-row--strength');
  await page.waitForSelector('#activitiesScreen .activity-detail-shell');

  await page.click('#activitiesHeaderActions [data-action="toggle-activity-menu"]');
  await page.click('#activityActionMenu [data-action="edit-activity"]');
  await page.waitForSelector('#editSavedSheet.active');
  ok(await page.locator('#editSavedBody input[data-edit-field="w"]').count() === 2, 'the editor lists both stored working sets');

  const firstWeight = page.locator('#editSavedBody input[data-edit-field="w"]').first();
  const firstReps = page.locator('#editSavedBody input[data-edit-field="r"]').first();
  await firstWeight.fill('105');
  await firstReps.fill('4');
  await page.fill('#editSavedNotes', 'Corrected after review');
  await page.click('#editSavedSheet [data-action="save-edit-saved"]');
  await page.waitForFunction(() => !document.getElementById('editSavedSheet')?.classList.contains('active'));

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
  const set = saved.weeks['1'].lifts.mon['Bench Press'][0];
  ok(set.w === '105' && set.r === '4', 'the corrected set is persisted');
  ok(set.c === true, 'the set stays completed');
  ok(saved.weeks['1'].notes.mon === 'Corrected after review', 'session notes are persisted');
  ok(saved.weeks['1'].sessionId === 'str_edit', 'the session identity is unchanged');

  const detail = await page.locator('#activitiesScreen .activity-detail-shell').innerText();
  ok(/105/.test(detail) && /4/.test(detail), 'the open recap shows the corrected set');
  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`\nedit-saved-browser-check: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nedit-saved-browser-check: PASS — saved workout edit, persistence and recap.');
