// @ts-check
// =============================================================================
// CORRUPT STATE PRESERVATION
//
// A JSON parse failure must never be treated as "no data": the onboarding gate
// would then save a pristine profile over bytes that might still be recoverable.
// Keep the unreadable blob under a side key and expose it to the recovery screen.
// =============================================================================

export const CORRUPT_SUFFIX = '_corrupt';

/**
 * Copy bytes that failed to parse into a side key. Never overwrites the original
 * state key. Returns true only when the copy was written.
 * @param {Storage|null|undefined} storage
 * @param {string} storageKey
 * @param {string|null|undefined} raw
 */
export function preserveCorruptState(storage, storageKey, raw) {
  if (!storage || !storageKey || typeof raw !== 'string' || !raw) return false;
  try {
    storage.setItem(storageKey + CORRUPT_SUFFIX, raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * The best recovery copy available: the preserved unreadable blob, else the
 * current readable state. Used by the recovery screen's export action.
 * @param {Storage|null|undefined} storage
 * @param {string} storageKey
 * @returns {string|null}
 */
export function recoveryRawState(storage, storageKey) {
  if (!storage || !storageKey) return null;
  try {
    return storage.getItem(storageKey + CORRUPT_SUFFIX)
      || storage.getItem(storageKey)
      || null;
  } catch {
    return null;
  }
}
