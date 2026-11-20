// ==========================================
// STATE MODULE-LOAD TEST (tests/state_import.test.js)
// Guards the Phase 4 Step 1 refactor: state.js must import cleanly in a
// DOM-less context. It must neither throw nor require a window or a network
// client. Run with `node --test`.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  appState, DEFAULT_DAYS, saveStateToLocalStorage, setPersistenceSuspended,
} from '../js/state.js';

test('state.js imports without a DOM and exposes its base state', () => {
  assert.equal(typeof appState, 'object');
  assert.equal(appState.currentWeek, '1');
  assert.deepEqual(DEFAULT_DAYS, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
});

test('a reset can suspend every local write until reload', async () => {
  const previous = globalThis.localStorage;
  const map = new Map();
  globalThis.localStorage = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
  try {
    setPersistenceSuspended(true);
    assert.equal(await saveStateToLocalStorage(true), false);
    assert.equal(map.size, 0, 'a pagehide flush cannot recreate the state key');
  } finally {
    setPersistenceSuspended(false);
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
