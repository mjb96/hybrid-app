// @ts-check
// =============================================================================
// REST TIMER PERSISTENCE
//
// A rest is the one part of a session that is pure wall-clock time. Losing it
// on reload meant the bar vanished and the athlete had to guess; backgrounding
// the Android WebView could do the same. The snapshot stores an ABSOLUTE end
// time, so time spent away still counts, and only state transitions write —
// never the 250ms tick.
//
// These tests pin the two failure modes that matter: a stale/expired rest must
// not resurrect at 0:00, and a paused rest must come back paused with exactly
// the remaining time it was holding.
// =============================================================================
import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

function makeNode(id) {
  const classes = new Set();
  const attrs = {};
  return {
    id,
    textContent: '',
    style: {},
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        const on = force === undefined ? !classes.has(c) : !!force;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      },
    },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    appendChild: () => {},
  };
}

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? /** @type {string} */ (map.get(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
    size: () => map.size,
  };
}

let nodes;
let storage;

globalThis.document = /** @type {any} */ ({
  getElementById: (id) => nodes[id] || null,
  querySelector: () => null,
  hidden: false,
});

const {
  triggerRestTimerEngine, toggleRestPause, isRestPaused, dismissRestTimer,
  adjustRestDuration, setRestTimerEnabled, setRestTiers, setRestOverrides,
  restoreRestTimer, clearRestTimerPersistence, REST_TIMER_STORAGE_KEY,
} = await import('../js/timers.js');

const snapshot = () => {
  const raw = storage.getItem(REST_TIMER_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};

beforeEach(() => {
  nodes = {
    cockpitTimerBar: makeNode('cockpitTimerBar'),
    cockpitTimerClock: makeNode('cockpitTimerClock'),
    restProgressFill: makeNode('restProgressFill'),
    restPauseBtn: makeNode('restPauseBtn'),
  };
  storage = makeStorage();
  globalThis.localStorage = /** @type {any} */ (storage);
  setRestTimerEnabled(true);
  setRestTiers({ warmup: 45, compound: 180, accessory: 120, isolation: 90 });
  setRestOverrides({});
  dismissRestTimer();
});

test('starting a rest persists an absolute end time, not a tick counter', () => {
  triggerRestTimerEngine('Back Squat', null, '');
  const saved = snapshot();
  assert.ok(saved, 'starting a rest wrote no snapshot');
  assert.equal(saved.v, 1);
  assert.equal(saved.lift, 'Back Squat');
  assert.equal(saved.total, 180);
  assert.equal(saved.paused, false);
  assert.ok(saved.endsAt > Date.now(), 'a running rest must persist when it ends');
  assert.ok(saved.endsAt <= Date.now() + 180_000, 'the end time is outside the prescribed rest');
  dismissRestTimer();
});

test('pausing and adjusting rewrite the held remaining', () => {
  triggerRestTimerEngine('Back Squat', null, '');
  assert.equal(toggleRestPause(), true);
  let saved = snapshot();
  assert.equal(saved.paused, true);
  assert.equal(saved.endsAt, null, 'a paused rest must not keep counting via an end time');
  const held = saved.remaining;
  assert.ok(held > 0);

  adjustRestDuration(30);
  saved = snapshot();
  assert.equal(saved.paused, true);
  assert.equal(saved.total, 210);
  assert.equal(saved.remaining, held + 30);
  dismissRestTimer();
});

test('a running rest restores from its end time', () => {
  const now = Date.now();
  storage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify({
    v: 1, lift: 'Back Squat', working: true, duration: 90, total: 90,
    paused: false, remaining: 90, endsAt: now + 42_000, savedAt: now,
  }));

  assert.equal(restoreRestTimer(), true);
  assert.equal(nodes.cockpitTimerBar.classList.contains('active'), true);
  assert.equal(nodes.cockpitTimerClock.textContent, '0:42');
  assert.equal(isRestPaused(), false);
  dismissRestTimer();
});

test('a paused rest restores paused with exactly the held time', () => {
  storage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify({
    v: 1, lift: 'Curl', working: true, duration: 60, total: 60,
    paused: true, remaining: 35, endsAt: null, savedAt: Date.now(),
  }));

  assert.equal(restoreRestTimer(), true);
  assert.equal(isRestPaused(), true);
  assert.equal(nodes.cockpitTimerClock.textContent, '0:35');
  assert.equal(nodes.cockpitTimerBar.classList.contains('rest-paused'), true);
  dismissRestTimer();
});

test('a rest that finished while the app was closed is not resurrected', () => {
  const now = Date.now();
  storage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify({
    v: 1, lift: 'Back Squat', working: true, duration: 90, total: 90,
    paused: false, remaining: 90, endsAt: now - 5_000, savedAt: now - 95_000,
  }));

  assert.equal(restoreRestTimer(), false);
  assert.equal(snapshot(), null, 'an expired rest stayed in storage');
  assert.equal(nodes.cockpitTimerBar.classList.contains('active'), false);
});

test('stale and corrupt snapshots are discarded', () => {
  const now = Date.now();
  storage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify({
    v: 1, lift: 'Back Squat', working: true, duration: 90, total: 90,
    paused: false, remaining: 90, endsAt: now + 60_000,
    savedAt: now - (3 * 60 * 60 * 1000),
  }));
  assert.equal(restoreRestTimer(), false);
  assert.equal(snapshot(), null);

  storage.setItem(REST_TIMER_STORAGE_KEY, '{not json');
  assert.equal(restoreRestTimer(), false);
  assert.equal(snapshot(), null);
});

test('dismissing and resetting both clear the snapshot', () => {
  triggerRestTimerEngine('Back Squat', null, '');
  assert.ok(snapshot());
  dismissRestTimer();
  assert.equal(snapshot(), null);

  triggerRestTimerEngine('Back Squat', null, '');
  assert.ok(snapshot());
  clearRestTimerPersistence();
  assert.equal(snapshot(), null);
  dismissRestTimer();
});
