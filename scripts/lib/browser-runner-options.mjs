// @ts-check
// =============================================================================
// BROWSER RUNNER OPTIONS
//
// Pure argument/CPU arithmetic for `scripts/run-browser-checks.mjs` so the
// defaults are testable without launching Chromium.
//
// Every browser check binds its own ephemeral port and launches its own
// Playwright context, so checks are safe to run concurrently. The default keeps
// one core free for Chromium's own processes; `--serial` restores the old
// one-at-a-time loop, and `--concurrency=N` pins an explicit worker count.
// =============================================================================

export const MAX_CONCURRENCY = 8;
export const DEFAULT_CHECK_TIMEOUT_SECONDS = 180;
export const MAX_CHECK_TIMEOUT_SECONDS = 3600;
export const DEFAULT_CHECK_RETRIES = 1;
export const MAX_CHECK_RETRIES = 3;

/**
 * @param {string[]} args
 * @param {number} [cpuCount]
 * @returns {number}
 */
export function resolveConcurrency(args, cpuCount = 4) {
  const serial = args.includes('--serial');
  const flag = args.find((arg) => arg.startsWith('--concurrency='));
  if (serial && flag) {
    throw new Error('--serial and --concurrency cannot be combined');
  }
  if (serial) return 1;
  if (flag) {
    const raw = flag.slice('--concurrency='.length);
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > MAX_CONCURRENCY) {
      throw new Error(`--concurrency must be an integer from 1 to ${MAX_CONCURRENCY}, got "${raw}"`);
    }
    return value;
  }
  const cpus = Number.isFinite(cpuCount) && cpuCount > 0 ? Math.floor(cpuCount) : 4;
  if (cpus <= 2) return cpus;
  // Three workers keeps browser startup reliable; four simultaneous Chromium
  // launches produced rare launch deadlocks on a 10-core developer machine.
  // `--concurrency=N` remains the escape hatch when a machine has headroom.
  return Math.min(3, cpus - 1);
}

/**
 * A hung browser must fail the run, not hold CI open until the job limit.
 * Individual checks take 2–30 s; 180 s is enough headroom for a slow runner
 * while still surfacing a deadlock quickly.
 *
 * @param {string[]} args
 * @param {number} [fallbackSeconds]
 * @returns {number}
 */
export function resolveTimeoutSeconds(args, fallbackSeconds = DEFAULT_CHECK_TIMEOUT_SECONDS) {
  const flag = args.find((arg) => arg.startsWith('--timeout='));
  if (!flag) return fallbackSeconds;
  const raw = flag.slice('--timeout='.length);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_CHECK_TIMEOUT_SECONDS) {
    throw new Error(`--timeout must be an integer from 1 to ${MAX_CHECK_TIMEOUT_SECONDS} seconds, got "${raw}"`);
  }
  return value;
}

/**
 * A hung Playwright launch is transient: the browser process exists but never
 * connects. One retry after the watchdog kills the process group turns that
 * from a red suite into a slower green one. Non-timeout failures are never
 * retried, so a genuine assertion failure stays visible.
 *
 * @param {string[]} args
 * @param {number} [fallback]
 * @returns {number}
 */
export function resolveRetries(args, fallback = DEFAULT_CHECK_RETRIES) {
  const flag = args.find((arg) => arg.startsWith('--retries='));
  if (!flag) return fallback;
  const raw = flag.slice('--retries='.length);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > MAX_CHECK_RETRIES) {
    throw new Error(`--retries must be an integer from 0 to ${MAX_CHECK_RETRIES}, got "${raw}"`);
  }
  return value;
}
