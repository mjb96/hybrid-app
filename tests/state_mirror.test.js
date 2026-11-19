// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMirrorState,
  chooseMirrorRestore,
  restoreStateMirror,
  writeMirror,
  clearMirror,
} from '../js/state/mirror.js';

const state = (name) => ({ weeks: {}, settings: { name } });
const raw = (name) => JSON.stringify(state(name));

test('parseMirrorState accepts a state object and rejects junk', () => {
  assert.deepEqual(parseMirrorState(raw('one')), state('one'));
  assert.equal(parseMirrorState(''), null);
  assert.equal(parseMirrorState('not json'), null);
  assert.equal(parseMirrorState('[]'), null);
  assert.equal(parseMirrorState('{"settings":{}}'), null);
});

test('mirror restores when localStorage is missing or invalid', () => {
  assert.deepEqual(
    chooseMirrorRestore({ localRaw: null, mirrorJson: raw('mirror'), mirrorSavedAt: '2026-11-19T10:00:00Z' }),
    { restore: true, reason: 'local-missing-or-invalid', state: state('mirror') },
  );
  assert.deepEqual(
    chooseMirrorRestore({ localRaw: 'not json', mirrorJson: raw('mirror'), mirrorSavedAt: '2026-11-19T10:00:00Z' }),
    { restore: true, reason: 'local-missing-or-invalid', state: state('mirror') },
  );
});

test('mirror wins only when it is newer than the local copy', () => {
  const newer = chooseMirrorRestore({
    localRaw: raw('local'),
    localSavedAt: '2026-11-19T09:00:00Z',
    mirrorJson: raw('mirror'),
    mirrorSavedAt: '2026-11-19T10:00:00Z',
  });
  assert.equal(newer.restore, true);
  assert.equal(newer.reason, 'mirror-newer');

  const older = chooseMirrorRestore({
    localRaw: raw('local'),
    localSavedAt: '2026-11-19T11:00:00Z',
    mirrorJson: raw('mirror'),
    mirrorSavedAt: '2026-11-19T10:00:00Z',
  });
  assert.equal(older.restore, false);
  assert.equal(older.reason, 'local-newer');

  const equal = chooseMirrorRestore({
    localRaw: raw('local'),
    localSavedAt: '2026-11-19T10:00:00Z',
    mirrorJson: raw('mirror'),
    mirrorSavedAt: '2026-11-19T10:00:00Z',
  });
  assert.equal(equal.restore, false, 'a tie must keep local');
});

test('a valid local copy without a saved-at marker keeps local', () => {
  const choice = chooseMirrorRestore({
    localRaw: raw('local'),
    localSavedAt: null,
    mirrorJson: raw('mirror'),
    mirrorSavedAt: '2026-11-19T10:00:00Z',
  });
  assert.equal(choice.restore, false);
  assert.equal(choice.reason, 'local-newer');
});

test('an invalid mirror never replaces a valid local copy', () => {
  const choice = chooseMirrorRestore({
    localRaw: raw('local'),
    localSavedAt: '2026-11-19T09:00:00Z',
    mirrorJson: '[]',
    mirrorSavedAt: '2026-11-19T10:00:00Z',
  });
  assert.equal(choice.restore, false);
  assert.equal(choice.reason, 'mirror-invalid');
});

class FakeStorage {
  constructor(initial = {}) {
    this.map = new Map(Object.entries(initial));
    this.failWrites = false;
  }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.map.set(key, String(value));
  }
}

function installBridge(mirror, onWrite = null) {
  const w = {
    HybridStateMirrorBridge: {
      read(callbackId) {
        queueMicrotask(() => {
          w.__helyxStateMirrorCB[callbackId](JSON.stringify(mirror));
        });
      },
      write(json, callbackId) {
        if (onWrite) onWrite(json);
        queueMicrotask(() => {
          w.__helyxStateMirrorCB[callbackId](JSON.stringify({ status: 'saved' }));
        });
      },
      clear(callbackId) {
        queueMicrotask(() => {
          w.__helyxStateMirrorCB[callbackId](JSON.stringify({ status: 'cleared' }));
        });
      },
      status(callbackId) {
        queueMicrotask(() => {
          w.__helyxStateMirrorCB[callbackId](JSON.stringify({ status: 'ok' }));
        });
      },
    },
  };
  globalThis.window = w;
  return w;
}

test('restoreStateMirror writes the winning mirror back to localStorage', async () => {
  installBridge({ status: 'ok', json: raw('mirror'), savedAt: '2026-11-19T10:00:00Z' });
  const storage = new FakeStorage();
  const result = await restoreStateMirror({ storage, stateKey: 'state', savedAtKey: 'state_at' });
  try {
    assert.equal(result.restored, true);
    assert.equal(result.wroteLocalStorage, true);
    assert.deepEqual(JSON.parse(storage.getItem('state')), state('mirror'));
    assert.equal(storage.getItem('state_at'), '2026-11-19T10:00:00Z');
  } finally {
    delete globalThis.window;
  }
});

test('restoreStateMirror still returns the state when localStorage is full', async () => {
  installBridge({ status: 'ok', json: raw('mirror'), savedAt: '2026-11-19T10:00:00Z' });
  const storage = new FakeStorage();
  storage.failWrites = true;
  const result = await restoreStateMirror({ storage, stateKey: 'state', savedAtKey: 'state_at' });
  try {
    assert.equal(result.restored, true);
    assert.equal(result.wroteLocalStorage, false);
    assert.deepEqual(result.state, state('mirror'));
  } finally {
    delete globalThis.window;
  }
});

test('writeMirror sends the document once and skips an unchanged copy', async () => {
  const writes = [];
  installBridge({ status: 'ok' }, (json) => writes.push(json));
  try {
    await clearMirror();
    const first = await writeMirror(raw('one'));
    assert.equal(first.status, 'saved');
    assert.deepEqual(writes, [raw('one')]);

    const second = await writeMirror(raw('one'));
    assert.equal(second.status, 'unchanged');
    assert.deepEqual(writes, [raw('one')], 'an unchanged document is not sent again');
  } finally {
    delete globalThis.window;
  }
});
