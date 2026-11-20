// =============================================================================
// DATA EXPORT — spreadsheet exports
//
// JSON import/export lives in js/settings.js (handleImportFile) and
// js/portability/auto-backup.js, which validate, migrate and include GPS routes.
// The old raw-state helpers here bypassed both, so they were deleted rather than
// left as a trap for a future button.
// =============================================================================
import { showToast } from '../toast.js';
import { buildBodyweightCsv, buildTrainingCsv } from '../portability/csv-export.js';
import { exportResultMessage, saveTextExport } from '../portability/export-service.js';

let _getState = null;
let _DEFAULT_DAYS = null;

export function initImportExport({ getState, defaultDays }) {
  _getState = getState;
  _DEFAULT_DAYS = defaultDays;
}

export async function triggerCSVExport() {
  const appState = _getState();
  if (!appState) return;
  const result = await saveTextExport({
    filename: 'openhybrid-data-export.csv',
    content: buildTrainingCsv(appState, _DEFAULT_DAYS),
    mime: 'text/csv',
  });
  const copy = exportResultMessage(result, 'CSV');
  showToast(copy.message, copy.error);
}

export async function triggerBodyweightCSVExport() {
  const appState = _getState();
  if (!appState) return;
  const result = await saveTextExport({
    filename: 'openhybrid-bodyweight-export.csv',
    content: buildBodyweightCsv(appState),
    mime: 'text/csv',
  });
  const copy = exportResultMessage(result, 'Bodyweight CSV');
  showToast(copy.message, copy.error);
}
