// @ts-check
// Prevent a fresh, empty device from overwriting a real local profile
// until it has either restored existing data or deliberately finished setup.

// State modules are also imported by non-boot test/tooling paths. The real app
// explicitly begins the gate at the start of storage hydration.
let pending = false;

export function beginRecoveryGate() {
  pending = true;
}

export function reconcileRecoveryGate({ hadLocalState = false, onboardingComplete = false } = {}) {
  pending = !(hadLocalState || onboardingComplete);
  return pending;
}

export function completeRecoveryGate() {
  pending = false;
}

export function isRecoveryGatePending() {
  return pending;
}
