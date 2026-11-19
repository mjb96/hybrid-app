// =============================================================================
// BROWSER RUNNER CONCURRENCY
//
// The browser suite is 34 independent checks. Running them one at a time made
// CI spend ~7 minutes mostly waiting on browser startup; the pool only works if
// the default leaves a core for Chromium and the overrides stay honest.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveConcurrency, resolveTimeoutSeconds, resolveRetries,
  MAX_CONCURRENCY, DEFAULT_CHECK_TIMEOUT_SECONDS, DEFAULT_CHECK_RETRIES,
} from '../scripts/lib/browser-runner-options.mjs';

test('concurrency defaults keep one core free for the browser', () => {
  assert.equal(resolveConcurrency([], 4), 3);
  assert.equal(resolveConcurrency([], 8), 3);
});

test('concurrency defaults never exceed the available cores on a small machine', () => {
  assert.equal(resolveConcurrency([], 2), 2);
  assert.equal(resolveConcurrency([], 1), 1);
});

test('concurrency falls back to a sane default when CPU count is unusable', () => {
  assert.equal(resolveConcurrency([], Number.NaN), 3);
  assert.equal(resolveConcurrency([], 0), 3);
});

test('--serial restores the one-at-a-time loop', () => {
  assert.equal(resolveConcurrency(['--serial'], 8), 1);
});

test('--concurrency pins an explicit worker count', () => {
  assert.equal(resolveConcurrency(['--concurrency=1'], 8), 1);
  assert.equal(resolveConcurrency(['--concurrency=4'], 2), 4);
  assert.equal(resolveConcurrency([`--concurrency=${MAX_CONCURRENCY}`], 2), MAX_CONCURRENCY);
});

test('invalid concurrency flags fail loudly instead of silently going serial', () => {
  assert.throws(() => resolveConcurrency(['--concurrency=0']), /integer from 1/);
  assert.throws(() => resolveConcurrency(['--concurrency=abc']), /integer from 1/);
  assert.throws(() => resolveConcurrency([`--concurrency=${MAX_CONCURRENCY + 1}`]), /integer from 1/);
  assert.throws(() => resolveConcurrency(['--serial', '--concurrency=2']), /cannot be combined/);
});

test('per-check timeout defaults to three minutes', () => {
  assert.equal(resolveTimeoutSeconds([]), DEFAULT_CHECK_TIMEOUT_SECONDS);
  assert.equal(resolveTimeoutSeconds([], 60), 60);
});

test('per-check timeout can be pinned but not disabled or unbounded', () => {
  assert.equal(resolveTimeoutSeconds(['--timeout=45']), 45);
  assert.throws(() => resolveTimeoutSeconds(['--timeout=0']), /integer from 1/);
  assert.throws(() => resolveTimeoutSeconds(['--timeout=soon']), /integer from 1/);
  assert.throws(() => resolveTimeoutSeconds(['--timeout=99999']), /integer from 1/);
});

test('a timed-out check is retried once by default', () => {
  assert.equal(resolveRetries([]), DEFAULT_CHECK_RETRIES);
  assert.equal(resolveRetries([]), 1);
});

test('retries can be disabled or pinned, but not unbounded', () => {
  assert.equal(resolveRetries(['--retries=0']), 0);
  assert.equal(resolveRetries(['--retries=2']), 2);
  assert.throws(() => resolveRetries(['--retries=-1']), /integer from 0/);
  assert.throws(() => resolveRetries(['--retries=later']), /integer from 0/);
  assert.throws(() => resolveRetries(['--retries=9']), /integer from 0/);
});
