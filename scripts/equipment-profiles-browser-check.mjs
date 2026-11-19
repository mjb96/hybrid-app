// =============================================================================
// EQUIPMENT PROFILES BROWSER CHECK
// Seeds two synthetic gyms (commercial + home) and proves that switching a
// profile projects its kit into the Settings checkboxes, adding/renaming/
// deleting profiles works, and the choice persists. No personal data involved.
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
const program = {
  id: 'equipment_profile_test', name: 'Equipment Profile Test', totalWeeks: 4,
  days: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [
    d, { title: d, lifts: ['Back Squat'], runs: 'Rest' },
  ])),
};
const gymEquipment = { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true, bands: false, kettlebells: true, ezBar: true, treadmill: true };
const homeEquipment = { barbell: true, rack: false, dumbbells: true, cables: false, pullupBar: true, bands: true, kettlebells: false, ezBar: false, treadmill: false };
const state = {
  schemaVersion: 6, currentWeek: '1', activeProgramId: program.id, activeActivationId: 'act_equipment', weekStartedAt: todayISO,
  activations: [{ id: 'act_equipment', programId: program.id, startWeek: 1, status: 'active', startedAt: todayISO }],
  settings: {
    name: 'Browser', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'strength', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { ...gymEquipment },
    bandWeights: { L: 10, M: 20, H: 30 },
    equipmentProfiles: [
      { id: 'eqp_gym', name: 'Commercial gym', equipment: { ...gymEquipment }, bandWeights: { L: 10, M: 20, H: 30 } },
      { id: 'eqp_home', name: 'Home', equipment: { ...homeEquipment }, bandWeights: { L: 5, M: 15, H: 25 } },
    ],
    activeEquipmentProfileId: 'eqp_gym',
  },
  customPrograms: [program],
  weeks: { '1': {
    activationId: 'act_equipment', programId: program.id,
    dates: { mon: '2026-11-16', tue: '2026-11-17', wed: '2026-11-18', thu: '2026-11-19', fri: '2026-11-20', sat: '2026-11-21', sun: '2026-11-22' },
    lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {},
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
  await context.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#homeWeekStrip');

  await page.click('#homeAvatar');
  await page.waitForSelector('#view-profile.active');
  await page.click('#view-profile [data-action="open-settings"]');
  await page.waitForSelector('#settingsOverlay.active');

  const select = page.locator('#settingsEquipmentProfile');
  const nameInput = page.locator('#settingsEquipmentProfileName');
  const cables = page.locator('[data-equipment="cables"]');
  const bands = page.locator('[data-equipment="bands"]');

  ok((await select.locator('option').allTextContents()).join('|') === 'Commercial gym|Home', 'both profiles are listed');
  ok((await select.inputValue()) === 'eqp_gym', 'the stored active profile is selected');
  ok((await nameInput.inputValue()) === 'Commercial gym', 'the name field shows the active profile');
  ok(await cables.isChecked(), 'commercial gym has cables checked');
  ok(!(await bands.isChecked()), 'commercial gym has bands unchecked');

  await select.selectOption('eqp_home');
  await page.waitForFunction(() => document.getElementById('settingsEquipmentProfileName')?.value === 'Home');
  ok((await nameInput.inputValue()) === 'Home', 'switching profiles updates the name field');
  ok(!(await cables.isChecked()), 'home profile hides cables');
  ok(await bands.isChecked(), 'home profile shows bands');
  ok((await page.locator('#settingsBandMed').inputValue()) === '15', 'home band weights replace the gym values');

  await nameInput.fill('Garage');
  await nameInput.press('Tab');
  await page.waitForFunction(() => [...document.querySelectorAll('#settingsEquipmentProfile option')].some((o) => o.textContent === 'Garage'));
  ok((await select.locator('option').allTextContents()).includes('Garage'), 'renaming updates the profile selector');

  await page.click('[data-action="equipment-profile-add"]');
  await page.waitForFunction(() => document.querySelectorAll('#settingsEquipmentProfile option').length === 3);
  ok((await page.locator('#settingsEquipmentProfile option').count()) === 3, 'adding a profile appends one option');
  ok((await nameInput.inputValue()).startsWith('Gym '), 'the new profile gets a usable default name');
  ok(await bands.isChecked(), 'the new profile starts from the active kit');

  await page.click('[data-action="equipment-profile-delete"]');
  await page.waitForSelector('.cmodal [data-cm="ok"]');
  await page.click('.cmodal [data-cm="ok"]');
  await page.waitForFunction(() => document.querySelectorAll('#settingsEquipmentProfile option').length === 2);
  ok((await page.locator('#settingsEquipmentProfile option').count()) === 2, 'deleting removes the active profile');
  ok((await nameInput.inputValue()) === 'Commercial gym', 'deleting the active profile falls back to the first one');

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
  ok(stored?.settings?.equipmentProfiles?.length === 2, 'profile changes are persisted');
  ok(stored?.settings?.equipmentProfiles?.some((p) => p.name === 'Garage'), 'the rename is persisted');
  ok(stored?.settings?.equipment?.cables === true, 'the active kit is projected into the legacy equipment field');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  console.error(`equipment-profiles-browser-check: FAIL — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('equipment-profiles-browser-check: PASS — synthetic gyms, switching, add/rename/delete and persistence.');
