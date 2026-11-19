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
  return Math.min(4, cpus - 1);
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
