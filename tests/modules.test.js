// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODULES,
  moduleEnabled,
  setModuleEnabled,
  applyModuleVisibility,
} from '../js/modules.js';

test('all modules default on', () => {
  const state = { settings: {} };
  for (const m of MODULES) assert.equal(moduleEnabled(state, m.id), true);
  assert.equal(moduleEnabled({}, 'running'), true);
});

test('toggling a module persists false and leaves the rest alone', () => {
  const state = { settings: {} };
  setModuleEnabled(state, 'running', false);
  assert.equal(moduleEnabled(state, 'running'), false);
  assert.equal(moduleEnabled(state, 'fasting'), true);
  setModuleEnabled(state, 'fasting', false);
  setModuleEnabled(state, 'running', true);
  assert.deepEqual(state.settings.modules, { running: true, fasting: false });
});

test('visibility publishes one data attribute per module', () => {
  const root = { dataset: {} };
  const state = { settings: { modules: { running: false, health: false } } };
  applyModuleVisibility(state, root);
  assert.equal(root.dataset.moduleRunning, 'off');
  assert.equal(root.dataset.moduleFasting, 'on');
  assert.equal(root.dataset.moduleHealth, 'off');
  assert.equal(root.dataset.moduleRecovery, 'on');
});
