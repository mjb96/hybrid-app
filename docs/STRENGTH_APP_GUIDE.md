# Helyx Strength — local implementation, 3 November 2026

## Using the app

- **Today:** resume/start a workout, review recent workload, bodyweight and goals.
- **Train:** enter weight and reps, then tick the set complete. Existing workout plans and history remain available. Other activities are tucked into a disclosure.
- **Progress:** choose dates, exercise, comparison exercise and metric. Select a chart-date button or training-date tile to inspect its underlying sets. Detailed volume and activity history remain available.
- **Bodyweight:** save a dated measurement, view its trend and seven-calendar-day means. Saving the same date corrects that measurement. Expand the history to edit an earlier date.
- **Programs:** browse all existing plans from the main navigation.
- **Progress → Goals:** set one target weight and repetition count per exercise, plus an optional bodyweight target. Edit a goal without changing training history.

## Calculation rules

Completed valid working sets count; warmups, incomplete sets and future dates do not. Existing calendar attribution/deduplication includes archived program runs. Sessions and training days are separate counts.

Estimated 1RM uses the existing shared Epley calculation for eligible external-load sets of 2–12 reps: load × (1 + reps / 30). A single uses its actual load. Bodyweight, assistance and band modes are excluded according to the shared exercise guards. Estimates are directional comparisons, not measured maxima or automatic prescriptions.

Relative strength divides session-best e1RM by the latest valid weigh-in on the same date or up to seven days earlier; no future measurement or interpolation is used. Each bodyweight mean uses available measurements within its stated seven-calendar-day window, not the last seven entries. Conflicting duplicate weigh-in dates are excluded until corrected through the date-entry form.

A strength target is achieved only when an eligible completed external-load set meets both target load and reps. The progress bar compares latest-session e1RM with the target's Epley-equivalent load; this estimate cannot itself complete a target. High-repetition targets can be completed by actual sets, but their equivalent estimate is especially uncertain.

Primary-muscle group counts can overlap across compound movements and must not be added as whole-body totals. The training calendar is a list/grid of recorded training dates, not a prescribed schedule. Unrecorded days are not inferred rest days.

## Saving and updates

The original app's local persistence, backup import/export and signed-in sync paths are retained. Goals use additive settings; existing training records are not migrated or deleted. Test entries used in local browser QA are not bundled in the application files.

This version does not read ChatGPT conversations, import the Excel workbook, or automatically synchronize the spreadsheet/dashboard. Logging in this app updates its own analytics. Existing cloud behavior has not been tested against a real account in this change. Keep an exported backup before updating production.

## Validation completed

- 1,809 automated tests passed, including new calendar weight means, archived records, invalid/warmup/incomplete sets, actual goal completion, assistance exclusions and relative-weight date matching.
- Type checking, smoke import/home rendering, precache and deployment workflow-gate checks passed.
- Browser QA: new profile setup, bodyweight save/correction, goal save, reload persistence, goal edit from Today, original workout logger, completed-set analytics, comparison/relative metric controls, source drill-down, invalid date-range feedback, and navigation.
- Test example: 100 kg × 5 produced 116.67 kg e1RM; with an 83.5 kg weigh-in, relative strength displayed 1.40×.
- Current browser viewport: 405 pixels wide, with document width 405. Broader desktop/tablet sizes, physical Android, native APK build, offline upgrade and real multi-device cloud synchronization were not verified.
- Host test runtime was Node 24; the repository declares Node 20–22. Re-run its existing CI gates on the declared version before deployment.

## Files and running locally

The source archive includes the strength-first branch changes and guide. It excludes dependencies, Git metadata and personal training data. Install dependencies with `npm ci` under Node 22. Serve the app root with `python3 -m http.server 8770 --bind 127.0.0.1`, then open http://127.0.0.1:8770/.

The web archive contains the allowlisted production assets. It must be served by a web host; opening index.html directly as a phone file is not a supported installation method. No public deployment, GitHub push, pull request or Android release was performed. Existing application icons and optional legacy tools retain their original branding.
