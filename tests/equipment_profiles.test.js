// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT_KEYS,
  DEFAULT_PROFILE_ID,
  ensureEquipmentProfiles,
  getActiveEquipmentProfile,
  projectActiveEquipmentProfile,
  switchEquipmentProfile,
  setActiveEquipmentKey,
  updateActiveBandWeights,
  addEquipmentProfile,
  renameEquipmentProfile,
  deleteEquipmentProfile,
  normalizeEquipment,
  normalizeBandWeights,
} from '../js/equipment-profiles.js';
import { migrateState, CURRENT_SCHEMA_VERSION } from '../js/state/migrations.js';

const baseState = () => ({
  settings: {
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 },
  },
});

test('ensure seeds one profile from the legacy kit', () => {
  const state = baseState();
  const profiles = ensureEquipmentProfiles(state);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].id, DEFAULT_PROFILE_ID);
  assert.equal(state.settings.activeEquipmentProfileId, DEFAULT_PROFILE_ID);
  assert.equal(profiles[0].equipment.bands, false);
  assert.deepEqual(profiles[0].bandWeights, { L: 10, M: 20, H: 30 });
});

test('switching profiles projects its equipment and band weights', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  state.settings.equipmentProfiles.push({
    id: 'eqp_home',
    name: 'Home',
    equipment: { barbell: true, rack: false, dumbbells: true, cables: false, pullupBar: true, bands: true },
    bandWeights: { L: 5, M: 15, H: 25 },
  });

  assert.equal(switchEquipmentProfile(state, 'eqp_home'), true);
  assert.equal(state.settings.activeEquipmentProfileId, 'eqp_home');
  assert.equal(state.settings.equipment.bands, true);
  assert.equal(state.settings.equipment.cables, false);
  assert.deepEqual(state.settings.bandWeights, { L: 5, M: 15, H: 25 });
  assert.equal(switchEquipmentProfile(state, 'missing'), false);
});

test('toggling equipment and bands edits only the active profile', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  addEquipmentProfile(state, 'Home');
  const home = getActiveEquipmentProfile(state);

  setActiveEquipmentKey(state, 'bands', true);
  setActiveEquipmentKey(state, 'cables', false);
  updateActiveBandWeights(state, { M: 12 });

  assert.equal(getActiveEquipmentProfile(state).equipment.bands, true);
  assert.equal(getActiveEquipmentProfile(state).equipment.cables, false);
  assert.equal(state.settings.equipment.bands, true);
  assert.deepEqual(state.settings.bandWeights, { L: 10, M: 12, H: 30 });

  switchEquipmentProfile(state, DEFAULT_PROFILE_ID);
  assert.equal(getActiveEquipmentProfile(state).equipment.bands, false);
  assert.equal(state.settings.equipment.bands, false);
  assert.equal(home.id !== DEFAULT_PROFILE_ID, true);
});

test('adding a profile copies the active kit, becomes active and uses a unique id', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  setActiveEquipmentKey(state, 'bands', true);

  const first = addEquipmentProfile(state);
  const second = addEquipmentProfile(state);
  assert.equal(first.name, 'Gym 2');
  assert.equal(second.name, 'Gym 3');
  assert.notEqual(first.id, second.id);
  assert.equal(state.settings.activeEquipmentProfileId, second.id);
  assert.equal(second.equipment.bands, true);
  assert.equal(second.bandWeights.L, 10);
});

test('renaming rejects blank names and trims real ones', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  assert.equal(renameEquipmentProfile(state, DEFAULT_PROFILE_ID, '   '), false);
  assert.equal(getActiveEquipmentProfile(state).name, 'My gym');
  assert.equal(renameEquipmentProfile(state, DEFAULT_PROFILE_ID, '  Commercial gym  '), true);
  assert.equal(getActiveEquipmentProfile(state).name, 'Commercial gym');
});

test('deleting the last profile is refused; deleting the active one switches', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  assert.equal(deleteEquipmentProfile(state, DEFAULT_PROFILE_ID), false);

  addEquipmentProfile(state, 'Home');
  const homeId = getActiveEquipmentProfile(state).id;
  assert.equal(deleteEquipmentProfile(state, homeId), true);
  assert.equal(getActiveEquipmentProfile(state).id, DEFAULT_PROFILE_ID);
  assert.equal(state.settings.activeEquipmentProfileId, DEFAULT_PROFILE_ID);
});

test('normalizers fill the core kit and clamp band weights', () => {
  const equipment = normalizeEquipment({ bands: true, cables: false });
  for (const key of EQUIPMENT_KEYS) assert.equal(typeof equipment[key], 'boolean');
  assert.equal(equipment.barbell, true);
  assert.equal(equipment.bands, true);
  assert.equal(equipment.cables, false);
  assert.deepEqual(normalizeBandWeights({ L: -2, M: '15', H: null }), { L: 10, M: 15, H: 30 });
});

test('an imported profile projection is repaired on demand', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  state.settings.equipment.cables = false;
  projectActiveEquipmentProfile(state);
  assert.equal(state.settings.equipment.cables, true);
});

test('v5 state migrates to an equipment profile without changing the kit', () => {
  const state = {
    schemaVersion: 5,
    settings: {
      equipment: { barbell: true, rack: false, dumbbells: true, cables: false, pullupBar: true, bands: true },
      bandWeights: { L: 5, M: 15, H: 25 },
    },
  };
  migrateState(state);
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
  const profile = state.settings.equipmentProfiles[0];
  assert.equal(profile.id, DEFAULT_PROFILE_ID);
  assert.equal(profile.equipment.bands, true);
  assert.equal(profile.equipment.rack, false);
  assert.deepEqual(profile.bandWeights, { L: 5, M: 15, H: 25 });
  assert.equal(state.settings.activeEquipmentProfileId, DEFAULT_PROFILE_ID);
});
