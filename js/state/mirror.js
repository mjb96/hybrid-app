// @ts-check
// =============================================================================
// ANDROID STATE MIRROR
//
// localStorage is the fast copy of app state and remains the source the UI
// reads. This module adds a durable, app-private file mirror in the Android
// shell, because WebView storage can be evicted and a localStorage quota write
// can fail. Browser/PWA builds have no bridge and every function no-ops.
//
// The mirror is written after every local save and read on boot. It is only
// restored when localStorage is missing, corrupt, or older than the mirror, so
// it can never overwrite a newer browser copy.
// =============================================================================

const REGISTRY = '__helyxStateMirrorCB';
const CALLBACK_PREFIX = 'state_mirror_';
const DEFAULT_TIMEOUT_MS = 4000;
const SAVED_AT_KEY_SUFFIX = '_saved_at';

let _seq = 0;
let _writing = false;
let _pendingJson = null;
let _lastWritten = null;

function _window() {
  return /** @type {any} */ (typeof window !== 'undefined' ? window : null);
}

/** True when the Android shell exposes the mirror bridge. */
export function mirrorSupported() {
  const w = _window();
  const bridge = w && w.HybridStateMirrorBridge;
  return !!(bridge && typeof bridge.write === 'function' && typeof bridge.read === 'function');
}

/** Call one bridge method. Every bridge resolves exactly one callback. */
function _call(method, args = [], timeoutMs = DEFAULT_TIMEOUT_MS) {
  const w = _window();
  const bridge = w && w.HybridStateMirrorBridge;
  if (!w || !bridge || typeof bridge[method] !== 'function') {
    return Promise.resolve({ status: 'unavailable' });
  }
  return new Promise((resolve) => {
    const id = `${CALLBACK_PREFIX}${++_seq}_${Date.now().toString(36)}`;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { if (w[REGISTRY]) delete w[REGISTRY][id]; } catch { /* ignore */ }
      resolve(value && typeof value === 'object'
        ? value
        : { status: 'error', message: 'Invalid state mirror response.' });
    };
    const timer = setTimeout(
      () => finish({ status: 'error', message: 'State mirror timed out.' }),
      timeoutMs,
    );
    if (!w[REGISTRY]) w[REGISTRY] = {};
    w[REGISTRY][id] = (raw) => {
      try { finish(JSON.parse(raw || '{}')); }
      catch { finish({ status: 'error', message: 'Invalid state mirror response.' }); }
    };
    try {
      bridge[method](...args, id);
    } catch (e) {
      finish({ status: 'error', message: e && e.message ? e.message : 'State mirror failed.' });
    }
  });
}

export function readMirror() {
  return _call('read');
}

export function mirrorStatus() {
  return _call('status');
}

export function clearMirror() {
  _pendingJson = null;
  _lastWritten = null;
  return _call('clear');
}

/**
 * Queue a mirror write. Writes are serialized and coalesced: while one is in
 * flight only the latest JSON is kept, so a burst of keystrokes cannot queue up
 * a long chain of full-state writes.
 */
export function writeMirror(json) {
  if (!mirrorSupported() || typeof json !== 'string' || !json) {
    return Promise.resolve({ status: 'unavailable' });
  }
  _pendingJson = json;
  if (_writing) return Promise.resolve({ status: 'queued' });
  _writing = true;
  return (async () => {
    let last = { status: 'unavailable' };
    try {
      while (_pendingJson != null) {
        const next = _pendingJson;
        _pendingJson = null;
        if (next === _lastWritten) {
          last = { status: 'unchanged' };
          continue;
        }
        last = await _call('write', [next]);
        if (last.status === 'saved') _lastWritten = next;
      }
      return last;
    } finally {
      _writing = false;
    }
  })();
}

/** Parse and shape-check a state document from either storage or the mirror. */
export function parseMirrorState(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed
      && typeof parsed === 'object'
      && !Array.isArray(parsed)
      && parsed.weeks
      && typeof parsed.weeks === 'object'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Pure restore decision. The mirror wins only when the local copy is absent,
 * invalid, or older by its saved-at marker. Equal timestamps keep local.
 *
 * @param {{ localRaw?: string|null, localSavedAt?: string|null, mirrorJson?: string|null, mirrorSavedAt?: string|null }} [options]
 */
export function chooseMirrorRestore({ localRaw, localSavedAt, mirrorJson, mirrorSavedAt } = {}) {
  const mirror = parseMirrorState(mirrorJson);
  if (!mirror) return { restore: false, reason: 'mirror-invalid', state: null };
  const local = parseMirrorState(localRaw);
  if (!local) return { restore: true, reason: 'local-missing-or-invalid', state: mirror };
  const localAt = Date.parse(localSavedAt || '');
  const mirrorAt = Date.parse(mirrorSavedAt || '');
  // A valid local copy without its marker could be one written in the crash
  // window between the state and saved-at writes. Keep it: the mirror is never
  // allowed to overwrite a readable local document on a missing timestamp.
  if (!Number.isFinite(localAt)) return { restore: false, reason: 'local-newer', state: null };
  if (Number.isFinite(mirrorAt) && mirrorAt > localAt) {
    return { restore: true, reason: 'mirror-newer', state: mirror };
  }
  return { restore: false, reason: 'local-newer', state: null };
}

/**
 * Read the mirror and, when it wins, write it back to localStorage. The parsed
 * state is returned even if the localStorage write fails (quota), so boot can
 * use the mirror directly.
 *
 * @param {{ storage?: Storage|null, stateKey?: string|null, savedAtKey?: string|null, now?: () => string }} [options]
 */
export async function restoreStateMirror({
  storage = (typeof localStorage !== 'undefined' ? localStorage : null),
  stateKey,
  savedAtKey = stateKey ? stateKey + SAVED_AT_KEY_SUFFIX : null,
  now = () => new Date().toISOString(),
} = {}) {
  if (!storage || !stateKey || !savedAtKey || !mirrorSupported()) {
    return { restored: false, reason: 'unavailable', state: null };
  }
  const mirror = await readMirror();
  if (mirror.status !== 'ok' || !mirror.json) {
    return { restored: false, reason: mirror.status || 'empty', state: null };
  }
  const choice = chooseMirrorRestore({
    localRaw: storage.getItem(stateKey),
    localSavedAt: storage.getItem(savedAtKey),
    mirrorJson: mirror.json,
    mirrorSavedAt: mirror.savedAt,
  });
  if (!choice.restore) return { restored: false, reason: choice.reason, state: null };

  let wroteLocalStorage = false;
  try {
    storage.setItem(stateKey, mirror.json);
    storage.setItem(savedAtKey, mirror.savedAt || now());
    wroteLocalStorage = true;
  } catch (e) {
    console.warn('State mirror could not be written back to localStorage:', e);
  }
  return {
    restored: true,
    reason: choice.reason,
    state: choice.state,
    wroteLocalStorage,
    savedAt: mirror.savedAt || null,
  };
}
