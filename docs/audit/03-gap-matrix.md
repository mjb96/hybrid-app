# 03 — Gap matrix: openGym → openHybrid

**Framing:** Helyx is a local-first, Android-first strength + running app with no account, server or cloud sync (`hybrid-app/README.md:5-12`, `:186-189`). openGym is a self-hosted, multi-user platform (`openGym/README.md:32-44`). Capabilities that require a server or multiple humans are marked **NOT APPLICABLE** rather than missing.

## Licence warning (read before any porting)

**Update (2026-11-19):** the project was relicensed from all-rights-reserved to **AGPL-3.0-only** and renamed **openHybrid**. openGym's code is also **AGPL-3.0** (`openGym/LICENSE:1`), so code reuse is now licence-compatible, provided the AGPL notice and source obligations are preserved. openGym's exercise stills/animations remain separately licensed from Gym visual and **may not be reused at all** (`openGym/NOTICE.md:48-60`).

**The backlog still assumes clean-room implementation as the provenance policy — never a code or asset copy.** "Effort" estimates assume that constraint; a deliberate module port would be cheaper but must carry the AGPL notice and survive a licence review.

## Matrix

| Capability | Layer | openGym status | Helyx status | Gap type | Confidence | Evidence (openGym / Helyx) |
|---|---|---|---|---|---|---|
| Core strength logging (sets, reps, weight, RPE/RIR, notes) | Workflow | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/views/Workout.jsx`; `hybrid-app/js/workout.js` |
| Guided session start/prefill/rest timer | Workflow | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/lib/session-start.js`; `hybrid-app/js/workout.js:584-600`; `hybrid-app/js/timers.js` |
| Exercise library breadth + demonstrations | Content | 6,554 exercises with licensed animations | 157 text-only exercises | PARTIAL | High | `openGym/catalogue/exercises/`; `openGym/docs/ARCHITECTURE.md:149-174` / `hybrid-app/js/exercises/catalog.js:135` |
| Exercise search/filter/detail | UI | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/views/Library.jsx`; `hybrid-app/js/exercises/catalog.js`; `hybrid-app/js/exercises/detail.js` |
| Supersets | Engine | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/lib/superset-meta.js`; `hybrid-app/js/workout.js:661-712` |
| Drop sets / AMRAP | Engine | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/lib/per-set.js`; `hybrid-app/js/workout/set-mutations.js:139-146` |
| Rest-pause, pyramids, per-set rest | Engine | COMPLETE | PARTIAL (no rest-pause/pyramid; global/override rest) | PARTIAL | High | `openGym/README.md:73-79`; `openGym/frontend/src/lib/pyramid.js` / `hybrid-app/js/timers.js`; `hybrid-app/js/workout/set-mutations.js:139-146` |
| Per-side reps and timed holds | Engine | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/per-set.js`; `openGym/frontend/src/lib/workout-model.js` / no fields in `hybrid-app/js/types.d.ts`; no timed editor in `hybrid-app/js/workout.js` |
| Exercise substitution keeping slot | Engine | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/lib/active-exercise-swap.js`; `hybrid-app/js/workout/substitutions.js` |
| Automatic warm-up ramp | Engine | COMPLETE | ABSENT (manual warm-up set type only) | MISSING | High | `openGym/frontend/src/lib/warmup-ramp.js`; `openGym/frontend/src/lib/session-start.js:18` / `hybrid-app/js/workout/set-mutations.js:146` |
| Plate math | Engine | COMPLETE (per-gym inventory + owned counts) | COMPLETE (standard/denominations, no counts) | PARTIAL | High | `openGym/frontend/src/lib/plates.js:1-50` / `hybrid-app/js/workout/plates.js:1-25`; `hybrid-app/js/equipment-profiles.js` |
| Plate inventory counts | Equipment | COMPLETE (pairs per size) | ABSENT (assumes enough plates) | MISSING | High | `openGym/frontend/src/lib/plates.js:5-8`, `:44-50` / `hybrid-app/js/workout/plates.js` greedy breakdown |
| Dumbbell / machine stack inventory | Equipment | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/dumbbells.js`; `openGym/frontend/src/lib/machine-kinds.js` / `hybrid-app/js/equipment-profiles.js` (plates/bands only) |
| Equipment profiles per gym | Equipment | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/lib/gym-inventory.js`; `openGym/docs/ARCHITECTURE.md:105-113` / `hybrid-app/js/equipment-profiles.js:1-16` |
| Progression policies | Engine | COMPLETE (10 policies, per routine/exercise) | PARTIAL (3 coach styles + weekly modifiers) | PARTIAL | High | `openGym/frontend/src/lib/progression.js:29-68`, `:109-118` / `hybrid-app/js/programs/progression-style.js:1-45`; `hybrid-app/js/programs/progression.js` |
| Automatic stall deload | Engine | COMPLETE (misses trigger deload; selectable target) | PARTIAL (warns only) | PARTIAL | High | `openGym/frontend/src/lib/progression.js:52-66`, `:158-232` / `hybrid-app/js/engine.js` plateau diagnostics |
| Estimated 1RM and PRs | Analytics | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/lib/onerm.js`; `openGym/frontend/src/lib/set-records.js` / `hybrid-app/js/strength/e1rm.js:1-12`; `hybrid-app/js/workout/session-review.js` |
| Saved-workout editing / move date | Workflow | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/session-edit.js:1-18`; `openGym/frontend/src/lib/workout-date.js` / no editor module; read-only history in `hybrid-app/js/analytics.js` |
| Bodyweight log and trend | Body | COMPLETE (+ goal corridor) | COMPLETE (trend, calendar averages; no goal corridor) | PARTIAL | High | `openGym/frontend/src/lib/bodyweight.js` / `hybrid-app/js/profile-stats.js:59-212`; `hybrid-app/js/portability/import-body-csv.js` |
| Body measurements (incl. custom fields) | Body | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/measurements.js:5-52`; `openGym/frontend/src/views/Measurements.jsx` / no measurement key in `hybrid-app/js/state.js:44-66` |
| Progress photos + before/after | Body | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/views/ProgressPhotos.jsx:1-20` / no photo store or view in `hybrid-app` |
| Muscle volume / recovery map | Analytics | COMPLETE (3 modes) | PARTIAL (volume guide; no body map for muscles) | PARTIAL | High | `openGym/frontend/src/lib/recovery.js:1-40`; `openGym/frontend/src/components/BodyMap.jsx` / `hybrid-app/js/analytics/volume-guide.js:45-81`; `hybrid-app/js/session-recap.js:91-143` |
| Structural balance ratios | Analytics | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/structuralBalance.js`; `openGym/frontend/src/views/StructuralBalance.jsx:1-16` / no module in `hybrid-app/js` |
| Strength levels | Analytics | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/strength-level.js:1-12` / no module in `hybrid-app/js` |
| Lifetime volume | Analytics | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/lib/lifetime.js` / `hybrid-app/js/athlete-profile.js:58-143` |
| Relative strength (lifts as % BW) | Analytics | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/relative-strength.js` / not found in `hybrid-app/js/profile-stats.js` |
| Activity heatmap / calendars | Analytics | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/views/Stats.jsx` / `hybrid-app/js/analytics/strength-calendar.js`; `hybrid-app/js/home/activity-calendar.js` |
| Training load / ACWR / readiness | Analytics | COMPLETE (recovery model) | COMPLETE (sRPE ATL/CTL + readiness) | PRESENT | High | `openGym/frontend/src/lib/recovery.js:1-40` / `hybrid-app/js/metrics/training-load.js:1-20`; `hybrid-app/js/analytics/scoring/readiness-scoring.js:1-16` |
| Running analytics | Analytics | PARTIAL (imported/manual activities, no live GPS) | COMPLETE (GPS, splits, route map, FIT, run analytics) | NOT APPLICABLE (Helyx ahead) | High | `openGym/frontend/src/lib/activities.js:1-20` / `hybrid-app/js/gps-tracker.js:571-655`; `hybrid-app/js/analytics/run-performance.js` |
| Fasting timer / protocols | Body | ABSENT | COMPLETE | NOT APPLICABLE (Helyx ahead) | High | no fasting feature in `openGym` / `hybrid-app/js/fasting.js:1-16` |
| Streaks + freezes | Motivation | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/src/lib/streak.js` / `hybrid-app/js/brain/streak.js:1-15` |
| Monthly challenges / trophies | Motivation | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/challenges.js`; `openGym/docs/MODULES.md:28` / no challenge keys in `hybrid-app/js/state.js:44-66` |
| Yearly Wrapped / recap | Motivation | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/wrapped.js`; `openGym/frontend/src/lib/wrapped-cards.js` / no module; closest is `hybrid-app/js/brain/monthly-report.js` |
| Seasonal themes / advent | Motivation | COMPLETE | ABSENT | NOT APPLICABLE | High | `openGym/frontend/src/lib/seasonal.js`; `openGym/frontend/src/lib/advent.js` / out of Helyx's product scope |
| Session notes | Workflow | COMPLETE (journal) | PARTIAL (one note per session) | PARTIAL | High | `openGym/frontend/src/views/Journal.jsx:1-12`; `openGym/frontend/src/lib/journal.js` / `hybrid-app/js/workout.js:500-504`, `:584-587` |
| Plan sharing file / PDF print | Workflow | COMPLETE | PARTIAL (Markdown text export only) | PARTIAL | High | `openGym/frontend/src/lib/plan-share.js`; `openGym/frontend/src/components/RoutineShare.jsx` / `hybrid-app/js/programs/program-export.js` |
| Weekday plan / rotation / floating queue | Scheduling | COMPLETE (week, pinned days, A/B/C rotation, queue) | PARTIAL (program week + fixed days; no rotation/queue) | PARTIAL | High | `openGym/frontend/src/lib/rotation.js`; `openGym/frontend/src/lib/queue.js` / `hybrid-app/js/programs/schedule.js`; `hybrid-app/js/state.js:44-49` |
| Import breadth (apps/formats) | Portability | COMPLETE (10+ formats incl. Apple Health, Liftosaur JSON, Hevy API) | PARTIAL (OpenGym/Strong/Hevy CSV + bodyweight) | PARTIAL | High | `openGym/docs/DATA_IMPORTS.md:24-40` / `hybrid-app/js/portability/import-workout-csv.js:1-10`; `hybrid-app/js/portability/import-body-csv.js` |
| Export breadth (sets, body, measurements) | Portability | COMPLETE (JSON, CSV, zip w/ media, WebDAV) | PARTIAL (JSON, training CSV, Android backup) | PARTIAL | High | `openGym/frontend/src/lib/export-csv.js`; `openGym/frontend/src/lib/zip.js` / `hybrid-app/js/portability/csv-export.js:41`; `hybrid-app/js/portability/export-service.js` |
| Off-device scheduled backup (WebDAV) | Portability | COMPLETE | ABSENT (Android folder backup only) | MISSING | High | `openGym/docs/WEBDAV_BACKUP.md:1-40`; `openGym/frontend/src/lib/webdav.js` / `hybrid-app/js/portability/auto-backup.js:85-187` |
| Calendar export / ICS feed | Integrations | COMPLETE (server feed) | ABSENT | MISSING | High | `openGym/docs/CALENDAR.md:1-40`; `openGym/api/integrations/calendar.js` / no ICS generator in `hybrid-app/js` |
| Strava upload | Integrations | COMPLETE (server OAuth app) | ABSENT | MISSING | High | `openGym/docs/INTEGRATIONS.md:16` / no Strava client in `hybrid-app/js`; only a FIT vendor string |
| Health Connect | Integrations | COMPLETE (two-way + vitals) | COMPLETE (read-only, 4 fields) | DIFFERENT | High | `openGym/frontend/src/lib/health-sync.js` / `hybrid-app/js/health/health-fields.js:1-40`; `hybrid-app/android/.../HealthFieldContract.kt` |
| Apple Health / iOS | Integrations | COMPLETE | ABSENT (no iOS) | NOT APPLICABLE | High | `openGym/docs/INTEGRATIONS.md:9` / `hybrid-app/README.md:188-190` |
| Live per-set heart rate | Integrations | COMPLETE | ABSENT | MISSING (platform-limited) | High | `openGym/frontend/src/lib/heart-rate.js` / no live HR module in `hybrid-app/js` |
| Local notifications / reminders | Notify | COMPLETE | COMPLETE (Android OS alarm + web notifications) | PRESENT | High | `openGym/frontend/src/lib/nudge.js` / `hybrid-app/js/notifications.js:1-12`; `hybrid-app/android/.../ReminderScheduler.kt` |
| Push notifications | Notify | COMPLETE (server push) | ABSENT | NOT APPLICABLE (no server) | High | `openGym/api/push-messages.js`; `openGym/frontend/src/lib/push.js` / no push client |
| Gym check-in QR/barcode/NFC | Utility | COMPLETE | ABSENT | NOT APPLICABLE | High | `openGym/frontend/src/views/CheckIn.jsx:1-14` / no scanner/card model; not a training-data capability |
| Gym geofence reminder | Notify | COMPLETE | ABSENT | MISSING | High | `openGym/frontend/src/lib/gym-reminder.js`; `openGym/frontend/src/views/GymReminder.jsx:1-10` / no geofence code in `hybrid-app/android` |
| Journal / searchable notes | Workflow | COMPLETE | PARTIAL (session note per day) | PARTIAL | High | `openGym/frontend/src/views/Journal.jsx:1-12` / `hybrid-app/js/workout.js:500-504` |
| Tools / calculators | Utility | COMPLETE | PARTIAL (plate/e1RM embedded, no Tools screen) | PARTIAL | Medium | `openGym/frontend/src/views/Tools.jsx:1-15` / plate + e1RM in `hybrid-app/js/workout/plates.js`, `js/strength/e1rm.js` |
| Android home-screen widget | Platform | COMPLETE | ABSENT | MISSING | High | `openGym/docs/ARCHITECTURE.md:143-147` / no widget provider in `hybrid-app/android` |
| Apple Watch / Wear OS / Zepp / Garmin apps | Platform | COMPLETE (Wear beta) | ABSENT | NOT APPLICABLE (no watch scope) | High | `openGym/docs/ARCHITECTURE.md:136-141`; `openGym/docs/WEAR_OS.md:8-11` / no watch tree in `hybrid-app` |
| Accounts, passkeys, OIDC | Auth | COMPLETE | ABSENT | NOT APPLICABLE (deliberate local-first) | High | `openGym/api/passkeys-store.js`; `openGym/api/oidc/` / `hybrid-app/README.md:5-12` |
| Multi-device sync / conflict merge | Sync | COMPLETE | ABSENT | NOT APPLICABLE (deliberate) | High | `openGym/frontend/src/lib/sync-merge.js:1-60` / `hybrid-app/README.md:186-189` |
| HTTP API / OpenAPI / tokens | API | COMPLETE | ABSENT | NOT APPLICABLE (no server) | High | `openGym/api/openapi.yaml`; `openGym/docs/API_TOKENS.md` / no API |
| Trainer / gym-lead sharing | Social | COMPLETE | ABSENT | NOT APPLICABLE (local-first, single user) | High | `openGym/docs/TRAINERS.md:1-40` / no user model |
| Community library | Social | COMPLETE | ABSENT | NOT APPLICABLE (needs server/accounts) | High | `openGym/frontend/src/views/Community.jsx:1-14` / no community surface |
| Admin dashboard / audit log | Admin | COMPLETE | ABSENT | NOT APPLICABLE (no server) | High | `openGym/frontend/src/views/Admin.jsx`; `openGym/api/server.js:1065-1083` / no admin |
| AI coach | AI | COMPLETE | ABSENT (deterministic coach only) | NOT APPLICABLE | High | `openGym/docs/AI_COACH.md:1-70` / `hybrid-app/js/brain/*` provides rule-based insights |
| MCP server | AI | COMPLETE | ABSENT | NOT APPLICABLE | High | `openGym/mcp/src/index.js:1-12` / no MCP |
| i18n / RTL | Non-functional | COMPLETE (25 locales) | ABSENT (English only) | MISSING | High | `openGym/frontend/src/locales/`; `openGym/README.md:108` / no locale packs in `hybrid-app/js` |
| Accessibility (touch targets, safe areas, modals) | Non-functional | COMPLETE (focus trap, a11y names, bidi) | COMPLETE (3 dedicated browser checks) | PRESENT | High | `openGym/frontend/src/lib/focus-trap.js`; `openGym/frontend/src/lib/a11y-name.js` / `hybrid-app/scripts/touch-target-browser-check.mjs`; `scripts/safe-area-browser-check.mjs`; `scripts/modal-accessibility-check.mjs` |
| Offline PWA | Non-functional | COMPLETE | COMPLETE | PRESENT | High | `openGym/frontend/public/sw.js:1-45` / `hybrid-app/sw.js`; `hybrid-app/scripts/gen-precache.mjs` |
| Crash/error observability | Non-functional | PARTIAL (audit log; no Sentry found) | COMPLETE (scrubbed Sentry) | DIFFERENT (Helyx ahead) | High | `openGym/api/server.js:1065-1083` / `hybrid-app/js/monitoring/sentry.js:1-60` |
| Docker / Helm / K8s deploy | Ops | COMPLETE | NOT APPLICABLE | NOT APPLICABLE | High | `openGym/docker-compose.yml`; `openGym/helm/` / static PWA + APK |

## Porting notes — every real gap

### 1. Exercise library breadth and demonstrations (PARTIAL; content)

**Problem it solves.** openGym's Library is the discovery surface: 6,554 exercises, searchable by muscle/equipment, each with written instructions and an animated demo (`openGym/frontend/src/views/Library.jsx:1`; `openGym/README.md:47-55`). Helyx has 157 text entries, so an experienced lifter can exhaust the catalogue and cannot preview unfamiliar movements.

**Porting touches.** Extend `hybrid-app/js/exercises/catalog.js` (currently `:135`, 157 entries), the picker/detail views (`js/exercises/detail.js`, `js/workout/exercise-picker.js`) and program metadata. The exercise *text* is AGPL and the media is Gym-visual-licensed, so neither can be copied: this needs either a newly written public-domain catalogue or a licensed media deal. A text-only expansion is possible now; animations are blocked on licensing.

### 2. Progression policy breadth (PARTIAL; engine)

**Problem it solves.** openGym lets a routine or a single exercise choose linear, Greyskull, double, steady double, triple, undulating, density, ladder or time progression (`openGym/frontend/src/lib/progression.js:29-68`). Helyx offers Double, Linear and Rep-first at program level (`hybrid-app/js/programs/progression-style.js:1-45`). Someone running 5×5, GZCL or a ladder program cannot express the intended rule.

**Porting touches.** `hybrid-app/js/engine.js` (`suggestProgression`, `computeDiagnosticForLift`), `js/programs/progression-style.js`, the program editor's Progression tab (`js/program_builder.js`), and the diagnostic tests (`tests/engine.test.js`). Start with **Triple** and **Greyskull** as clean-room rules; keep the existing RPE/fatigue/cut/stall safeguards. Per-exercise policy needs a small schema addition to the program lift shape (currently bare strings, `js/program_builder.js:1-5`).

### 3. Automatic stall deload (PARTIAL; engine)

**Problem it solves.** openGym counts repeated misses and prescribes a deload at a factor of the current load, with a selectable target (`openGym/frontend/src/lib/progression.js:52-66`, `:158-232`). Helyx detects a plateau and warns, but leaves the deload decision entirely manual. A lifter who ignores the warning keeps grinding the same load.

**Porting touches.** `hybrid-app/js/engine.js` (diagnostic actions), `js/programs/progression.js` (week modifiers) and the workout cockpit's coach target. Needs a small persisted record of consecutive misses per lift (currently derived from history) and a UI confirmation — auto-changing load without consent would violate Helyx's "suggest, don't surprise" posture.

### 4. Automatic warm-up ramp (MISSING; engine)

**Problem it solves.** openGym builds warm-up sets from the working weight/routine and lets the lifter edit them (`openGym/frontend/src/lib/warmup-ramp.js`; `openGym/frontend/src/lib/session-start.js:18`, `:70`). Helyx treats warm-ups as a manual set type, so every session starts with the same arithmetic.

**Porting touches.** New pure module under `hybrid-app/js/workout/` (ramp model), `js/workout/set-plan.js` (seed rows at session start), `js/workout.js` (render/edit), and the program editor's per-exercise warm-up setting. This is small, testable, and needs no schema migration if the ramp is generated at start and stored as normal warm-up rows.

### 5. Plate inventory counts (MISSING; equipment)

**Problem it solves.** openGym stores *pairs per denomination* and refuses a breakdown the rack cannot build (`openGym/frontend/src/lib/plates.js:1-8`, `:44-50`). Helyx stores denominations and greedily assumes unlimited plates (`hybrid-app/js/workout/plates.js`), so a home gym with one pair of 25s gets a confident wrong hint.

**Porting touches.** `hybrid-app/js/equipment-profiles.js` `plateSetup` (add counts per size), `js/workout/plates.js` `computePlateBreakdown` (respect availability and return "not buildable"), Settings plate editor (`js/settings.js`, `index.html:1613-1636`), and a v7 migration seeding counts from the current unlimited default. This also fixes the false confidence in the opt-in hint.

### 6. Dumbbell and machine-stack inventory (MISSING; equipment)

**Problem it solves.** openGym models dumbbell ladders (each vs total), machine stacks with odd steps, and uses them for target rounding (`openGym/frontend/src/lib/dumbbells.js`; `openGym/frontend/src/lib/machine-kinds.js`). Helyx rounds dumbbell/machine work by a generic increment, so the suggested load can be a weight the gym does not own.

**Porting touches.** `hybrid-app/js/equipment-profiles.js` (new inventory fields), `js/engine.js` target rounding, `js/workout/set-entry.js` stepping, Settings, and schema v7. This pairs naturally with plate counts as one "equipment inventory" slice.

### 7. Per-side reps and timed holds (MISSING; engine)

**Problem it solves.** openGym records per-side reps for lunges/single-arm work and time-based holds/carries (`openGym/frontend/src/lib/per-set.js`; `openGym/frontend/src/lib/workout-model.js`). Helyx cannot distinguish "8 each side" from "8 total", and has no timed-set editor.

**Porting touches.** `hybrid-app/js/types.d.ts`, `js/workout/set-entry.js`, `js/workout.js`, `js/set-utils.js` (validity/volume), CSV import/export, and analytics validity rules. Medium effort because every consumer of a set row must agree on what a side/time value means.

### 8. Rest-pause, pyramid sets and per-set rest (PARTIAL; engine)

**Problem it solves.** openGym supports pyramid sets with their own reps/rest, rest-pause clusters and a scroll-wheel rest up to 15 minutes (`openGym/README.md:73-79`; `openGym/frontend/src/lib/pyramid.js`). Helyx has warm-up/drop/AMRAP types and a per-exercise rest override, but no per-set rest or pyramid/rest-pause structures.

**Porting touches.** `hybrid-app/js/workout/set-mutations.js`, `js/timers.js`, `js/workout.js` and the set model in `js/types.d.ts`. A per-set rest field is the smallest useful slice; pyramid/rest-pause can follow without a schema migration if encoded as set metadata.

### 9. Saved-workout editing and moving dates (MISSING; workflow)

**Problem it solves.** openGym lets a lifter edit a finished workout (sets, notes), log a paper session, or move it to another date, then re-reads records from corrected history (`openGym/frontend/src/lib/session-edit.js:1-18`; `openGym/README.md:93-97`). Helyx history is read-only, so a typo or a forgotten set is permanent.

**Porting touches.** `hybrid-app/js/analytics.js` (history detail), `js/state.js` week records, `js/engine.js` / `js/workout/session-review.js` (recompute e1RM/PRs), `js/state/run-sessions.js` (date moves), export/import and the Android mirror. The PR/stat recomputation is the risky part; keep the edit as "replace one archived session, then rebuild derived stats" rather than mutating aggregates in place.

### 10. Body measurements (MISSING; body)

**Problem it solves.** openGym tracks weight, body measurements with custom fields/units and blood pressure (`openGym/frontend/src/lib/measurements.js:5-52`; `openGym/frontend/src/views/Measurements.jsx`). Helyx tracks only bodyweight, so waist/arm/chest trends require an external app.

**Porting touches.** New `measurements` state key + migration, a Progress subview, CSV import/export, Android backup include-list and tests. This is a self-contained slice and does not require photos.

### 11. Progress photos with comparison (MISSING; body)

**Problem it solves.** openGym stores dated photos, strips location on device, offers a before/after comparison and ties photos to workouts/days (`openGym/frontend/src/views/ProgressPhotos.jsx:1-20`; `openGym/frontend/src/lib/photo-date.js`). Helyx has no visual progress record.

**Porting touches.** IndexedDB blob store (Helyx already uses IndexedDB for GPS routes), Android file bridge/backup, export/restore, privacy controls and a comparison UI. Large effort and high privacy risk — rank after measurements.

### 12. Muscle volume / recovery map (PARTIAL; analytics)

**Problem it solves.** openGym's muscle map shows volume, recovery and untrained muscles on a body (`openGym/frontend/src/lib/recovery.js:1-40`; `openGym/frontend/src/components/BodyMap.jsx`). Helyx has a volume guide and a body map used for routes, but no per-muscle recovery/volume shading.

**Porting touches.** `hybrid-app/js/analytics/volume-guide.js` (already credits direct/indirect sets), `js/exercises/catalog.js` muscle data, a new pure map model, and an SVG body renderer. The model is the valuable part; start with a per-muscle heat list if a body drawing is too much; do not copy openGym's MuscleMap-derived geometry without carrying its MIT notice.

### 13. Strength levels (MISSING; analytics)

**Problem it solves.** openGym grades each lift from Beginner to Elite against bodyweight and sex (`openGym/frontend/src/lib/strength-level.js:1-12`), giving a motivational frame beyond raw PRs. Helyx shows e1RM and PR trends but no level.

**Porting touches.** New pure module + a published standards table (public strength standards, not openGym code), Athlete Profile and exercise detail. Small effort; the only risk is choosing and citing the standards honestly.

### 14. Structural balance ratios (MISSING; analytics)

**Problem it solves.** openGym compares opposing lifts against templates (Poliquin/Thibaudeau/ATG) and flags imbalances (`openGym/frontend/src/views/StructuralBalance.jsx:1-16`). Helyx shows per-lift trends but no cross-lift ratios.

**Porting touches.** `hybrid-app/js/strength/e1rm.js`, exercise metadata (movement pattern/muscle), a new template model and a Progress card. Niche but cheap once e1RM history exists.

### 15. Monthly challenges and trophies (MISSING; motivation)

**Problem it solves.** openGym's Motivation module runs monthly challenges, a trophy shelf and a recap (`openGym/frontend/src/lib/challenges.js`; `openGym/docs/MODULES.md:28`). Helyx has streaks but no short-term goals beyond programs.

**Porting touches.** Derive challenges from existing history (`js/home/activity-calendar.js`, `js/brain/streak.js`), add a Home/Progress card and optional notifications. No schema change if progress is derived; only trophy state needs persistence.

### 16. Yearly Wrapped (MISSING; motivation/sharing)

**Problem it solves.** openGym generates a year-in-review with share cards (`openGym/frontend/src/lib/wrapped.js`; `openGym/frontend/src/lib/wrapped-cards.js`). Helyx already has weekly/monthly reviews and share-card infrastructure (`js/brain/monthly-report.js`, `js/brain/pr-share.js`), but no annual story.

**Porting touches.** New report model over existing history, a full-screen story UI, and reuse of the canvas share path in `js/brain/pr-share.js`. Medium effort, seasonal value.

### 17. Plan sharing file and PDF (PARTIAL; workflow)

**Problem it solves.** openGym exports a plan as a file or prints it to PDF for a coach/friend (`openGym/frontend/src/lib/plan-share.js`; `openGym/frontend/src/components/RoutineShare.jsx`). Helyx's `program-export.js` emits Markdown text only, with no import counterpart.

**Porting touches.** Add a versioned JSON plan format (reuse `program-export.js`), an importer that validates and merges as a custom program, and print CSS for the existing preview. No server needed.

### 18. Import breadth (PARTIAL; portability)

**Problem it solves.** openGym accepts FitNotes, Strong, Hevy, Gravl, Liftosaur (CSV+JSON), Liftoff, StrongLifts, Fitbod, JEFIT and Apple Health exports (`openGym/docs/DATA_IMPORTS.md:24-40`). Helyx accepts OpenGym/Strong/Hevy-shaped CSV and bodyweight CSV (`hybrid-app/js/portability/import-workout-csv.js:1-10`). A switcher from FitNotes or Liftosaur has no path.

**Porting touches.** Extend `import-workout-csv.js` with format detectors + clean-room parsers; add synthetic fixtures per format under `tests/`; keep idempotent merge and "existing dates win". Liftosaur JSON also needs routine import, not just history.

### 19. Export breadth (PARTIAL; portability)

**Problem it solves.** openGym exports JSON, CSV for sets/weigh-ins/measurements, and a zip with photos (`openGym/frontend/src/lib/export-csv.js`; `openGym/frontend/src/lib/zip.js`). Helyx exports JSON and a training CSV; bodyweight and future measurements are not in the CSV.

**Porting touches.** `hybrid-app/js/portability/csv-export.js:41` and `export-service.js`; add bodyweight/measurement sections and a manifest. Small, and it strengthens the existing backup story.

### 20. Weekday rotation and floating queue (PARTIAL; scheduling)

**Problem it solves.** openGym supports A/B/C rotation ("next session you haven't done") and a floating week queue, not just fixed weekdays (`openGym/frontend/src/lib/rotation.js`; `openGym/frontend/src/lib/queue.js`). Helyx is program-week + fixed days, so a shift worker or someone who misses Tuesday has no clean reschedule path.

**Porting touches.** `hybrid-app/js/programs/schedule.js`, `js/state.js` week model, Home/Train day selection, and the program editor. This is a scheduling model change; do it after saved-workout editing, which supplies the "move this session" primitive.

### 21. WebDAV off-device backup (MISSING; portability)

**Problem it solves.** openGym backs up daily to a user's Nextcloud/WebDAV folder, with restore/merge and 14-day retention (`openGym/docs/WEBDAV_BACKUP.md:1-40`). Helyx's Android backup folder is good but still on the same device/account; a lost phone can lose both copies.

**Porting touches.** New backup target in `hybrid-app/js/portability/auto-backup.js`, Settings credentials (Android Keystore/secure storage), network permission and retry logic, and tests for retention/merge. High strategic fit with Helyx's data-ownership promise, but it adds the first network dependency — keep it opt-in and user-supplied.

### 22. Calendar export/ICS (MISSING; integrations)

**Problem it solves.** openGym publishes a private ICS feed of planned/finished sessions (`openGym/docs/CALENDAR.md:1-40`). Helyx users cannot see their plan in a calendar without retyping it.

**Porting touches.** A pure ICS generator over `programs/schedule.js` + archived weeks, an "Export calendar" action in Settings/Plans, and file sharing via `export-service.js`. No server; a static `.ics` file is enough, and it avoids openGym's token/feed complexity.

### 23. Strava upload (MISSING; integrations)

**Problem it solves.** openGym sends finished cardio (and optionally strength) to Strava (`openGym/docs/INTEGRATIONS.md:16`). Helyx tracks runs well but they stay in the app.

**Porting touches.** OAuth + upload client, secret storage, retry/queue, and a privacy review. This is the first third-party account integration and conflicts with "no account" simplicity; if pursued, make it a one-way opt-in export of GPX/FIT rather than a live connection.

### 24. Bodyweight goal corridor (PARTIAL; body)

**Problem it solves.** openGym draws the weight chart against a goal line with a weekly-rate corridor (`openGym/frontend/src/lib/bodyweight.js`; `openGym/README.md:91-93`). Helyx has a trend sparkline and calendar-window averages (`hybrid-app/js/profile-stats.js:59-212`) but no goal corridor.

**Porting touches.** `profile-stats.js` chart, `settings.weightGoal`, and a small rate-corridor model. Low effort, useful with the existing weight-goal setting.

### 25. Searchable journal (PARTIAL; workflow)

**Problem it solves.** openGym collects day/exercise/gym notes into a searchable, folderable journal (`openGym/frontend/src/views/Journal.jsx:1-12`; `openGym/frontend/src/lib/journal.js`). Helyx stores one free-text note per session (`hybrid-app/js/workout.js:500-504`, `:584-587`) and shows it nowhere searchable.

**Porting touches.** Existing `week.notes` data + a new Journal subview with search/filters; optionally standing exercise notes keyed by exercise id. No migration if it reads existing notes.

### 26. Android home-screen widget (MISSING; platform)

**Problem it solves.** openGym exposes today's session/rest actions on the home screen (`openGym/docs/ARCHITECTURE.md:143-147`). Helyx requires opening the app to see today's session.

**Porting touches.** A `Glance`/RemoteViews provider in `hybrid-app/android`, a state snapshot written by `StateMirrorBridge`/a new bridge, and JVM tests. Medium effort; no web change beyond the snapshot.

### 27. Gym geofence reminder (MISSING; notify)

**Problem it solves.** openGym can nudge once a day when you arrive at a saved gym (`openGym/frontend/src/views/GymReminder.jsx:1-10`). Helyx only has time-based reminders.

**Porting touches.** Android geofencing + location permission, saved gym places, and a once/day policy. Battery/privacy cost is real; rank later than backup and editing.

### 28. Internationalisation (MISSING; non-functional)

**Problem it solves.** openGym ships 25 locale packs incl. RTL Arabic/Persian (`openGym/frontend/src/locales/`; `openGym/README.md:108`). Helyx is English-only, which caps reach.

**Porting touches.** String extraction across ~55k lines of JS/HTML, a locale loader, RTL CSS/logical properties, and translated exercise names. This is a large, cross-cutting program, not a sprint.

## NOT APPLICABLE justifications

- **Accounts/passkeys/OIDC, sync/conflict merge, API/OpenAPI/tokens, admin/audit log, trainer/community, AI coach, MCP, push notifications:** all require a server and/or multiple users. Helyx explicitly promises no account, no backend and no cloud sync (`hybrid-app/README.md:5-12`, `:186-189`). Adding them would be a product decision, not a missing feature.
- **Apple Health, iOS, Apple Watch, Wear OS, Zepp, Garmin watch apps:** Helyx has no iOS project and is Android-first; watch apps are out of scope (`hybrid-app/README.md:188-190`). Health Connect already covers the Android health path.
- **Gym check-in QR/barcode/NFC:** a peripheral gym-membership utility, not training data, and it adds camera/NFC permissions. It does not serve the strength/running core.
- **Seasonal themes/advent:** explicitly a motivation/theme feature in openGym's module list; Helyx has no seasonal product surface.
- **Docker/Helm/K8s deploy:** Helyx is a static PWA plus signed Android package, not a hosted service.
