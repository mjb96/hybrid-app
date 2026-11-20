// @ts-check
// Blocking startup recovery for a state schema that could not be upgraded.
// The persisted blob is deliberately left untouched so retrying after an app
// update always starts from the same recoverable bytes.
import { openManagedModal } from '../ui/modal-stack.js';
import { saveTextExport, exportResultMessage } from '../portability/export-service.js';

/** @param {unknown} error */
export function migrationRecoveryCopy(error) {
  if (error && typeof error === 'object' && 'corrupt' in error && error.corrupt) {
    return {
      title: 'Your saved data needs attention',
      message: 'openHybrid could not read the saved file, so it stopped before overwriting it. Export a copy first, then retry. If the file cannot be recovered, start fresh only after saving that copy.',
      action: 'Retry',
    };
  }
  const futureSchema = !!(error && typeof error === 'object' &&
    'fromVersion' in error && 'toVersion' in error &&
    error.fromVersion === error.toVersion);
  return {
    title: 'Your data is safe',
    message: futureSchema
      ? 'This data was saved by a newer version of openHybrid. Update the app, then retry.'
      : 'openHybrid could not finish a data upgrade, so it stopped before saving any changes. Update the app or retry when you are ready.',
    action: 'Retry',
  };
}

/**
 * @param {unknown} error
 * @param {Document} [doc]
 * @param {() => void} [reload]
 * @param {{ getRawState?: () => string|null, onStartFresh?: () => void }} [options]
 */
export function showMigrationRecovery(error, doc = document, reload = () => location.reload(), options = {}) {
  const existing = doc.getElementById('migrationRecovery');
  if (existing) return existing;
  const copy = migrationRecoveryCopy(error);

  const backdrop = doc.createElement('div');
  backdrop.id = 'migrationRecovery';
  backdrop.className = 'migration-recovery';
  backdrop.setAttribute('role', 'alertdialog');
  backdrop.setAttribute('aria-labelledby', 'migrationRecoveryTitle');
  backdrop.setAttribute('aria-describedby', 'migrationRecoveryMessage');

  const panel = doc.createElement('div');
  panel.className = 'migration-recovery__panel';
  const eyebrow = doc.createElement('div');
  eyebrow.className = 'migration-recovery__eyebrow';
  eyebrow.textContent = 'Protected recovery';
  const title = doc.createElement('h1');
  title.id = 'migrationRecoveryTitle';
  title.textContent = copy.title;
  const message = doc.createElement('p');
  message.id = 'migrationRecoveryMessage';
  message.textContent = copy.message;
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'btn-primary migration-recovery__action';
  button.textContent = copy.action;
  button.addEventListener('click', reload);
  panel.append(eyebrow, title, message, button);

  // Never trap the athlete with an unreadable blob and no way to save it.
  // The raw bytes are exported as-is, not re-serialised from defaults.
  const raw = typeof options.getRawState === 'function' ? options.getRawState() : null;
  if (raw) {
    const exportButton = doc.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'btn-ghost migration-recovery__action migration-recovery__secondary';
    exportButton.textContent = 'Export a copy';
    exportButton.addEventListener('click', async () => {
      exportButton.disabled = true;
      const result = await saveTextExport({
        filename: 'openhybrid-recovery-copy.json',
        content: raw,
        mime: 'application/json',
      });
      const msg = exportResultMessage(result, 'Recovery copy');
      exportButton.textContent = msg.error ? 'Export failed — retry' : 'Exported ✓';
      exportButton.disabled = false;
    });
    panel.append(exportButton);
  }

  if (typeof options.onStartFresh === 'function') {
    const freshButton = doc.createElement('button');
    freshButton.type = 'button';
    freshButton.className = 'btn-ghost migration-recovery__action migration-recovery__secondary';
    freshButton.textContent = 'Start fresh (erases this copy)';
    freshButton.addEventListener('click', () => {
      if (freshButton.getAttribute('data-confirmed') !== '1') {
        freshButton.setAttribute('data-confirmed', '1');
        freshButton.textContent = 'Tap again to erase everything';
        return;
      }
      freshButton.disabled = true;
      options.onStartFresh();
    });
    panel.append(freshButton);
  }

  backdrop.append(panel);
  doc.body.append(backdrop);
  openManagedModal(backdrop, { initialFocus: button, dismissible: false, history: false });
  return backdrop;
}
