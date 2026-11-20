import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CORRUPT_SUFFIX, preserveCorruptState, recoveryRawState,
} from '../js/state/corrupt-state.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    dump: () => Object.fromEntries(map),
  };
}

test('an unreadable blob is preserved under a side key, not overwritten', () => {
  const storage = memoryStorage({ hybrid_engine_v2_state: '{broken' });
  assert.equal(preserveCorruptState(storage, 'hybrid_engine_v2_state', '{broken'), true);
  assert.equal(storage.getItem('hybrid_engine_v2_state'), '{broken');
  assert.equal(storage.getItem('hybrid_engine_v2_state' + CORRUPT_SUFFIX), '{broken');
});

test('the recovery copy prefers the unreadable blob over a readable state', () => {
  const storage = memoryStorage({
    hybrid_engine_v2_state: '{"ok":true}',
    ['hybrid_engine_v2_state' + CORRUPT_SUFFIX]: '{broken',
  });
  assert.equal(recoveryRawState(storage, 'hybrid_engine_v2_state'), '{broken');
});

test('a readable state is still exportable from the recovery screen', () => {
  const storage = memoryStorage({ hybrid_engine_v2_state: '{"ok":true}' });
  assert.equal(recoveryRawState(storage, 'hybrid_engine_v2_state'), '{"ok":true}');
});

test('missing storage or bytes never throws', () => {
  assert.equal(preserveCorruptState(null, 'key', 'x'), false);
  assert.equal(preserveCorruptState(memoryStorage(), 'key', ''), false);
  assert.equal(recoveryRawState(null, 'key'), null);
});
