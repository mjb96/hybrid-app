// @ts-check
// =============================================================================
// SECURE ID SUFFIX (js/util/secure-id.js)
//
// IDs that identify stored records are not secrets, but they must never depend
// on Math.random when a cryptographic source is available: a predictable id is
// an identity hazard, and static analysis treats record ids as a security
// context. Falls back to a timestamp only when the platform has no Web Crypto.
// =============================================================================

/** @param {number} [length] */
export function secureRandomSuffix(length = 8) {
  const size = Math.max(4, Math.min(32, Number(length) || 8));
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, size);
    }
  } catch { /* fall through */ }
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return [...bytes].map((byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, size);
    }
  } catch { /* fall through */ }
  return Date.now().toString(36).slice(-size);
}
