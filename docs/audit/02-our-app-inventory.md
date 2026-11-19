# 02 — Our app inventory: openHybrid (formerly Helyx)

> **Name note:** this inventory was captured while the project was named **Helyx**. It is now **openHybrid**; the evidence paths are unchanged.

**Audit date:** 2026-11-19
**Clone:** `/private/var/folders/6f/xfbl97yn6550ff51rv25yq5h0000gn/T/opencode/audit/hybrid-app`
**Commit:** `abbeb97f127088bc0db8199df11894934645fe45`
**Primary languages:** JavaScript (440 `.js`), Kotlin (26), CSS (6)
**Frameworks:** Vanilla JS ES modules (no framework, no build step); plain CSS; service worker; Kotlin Android WebView shell (minSdk 26, targetSdk 36); Node test runner + Playwright
**Package manager:** npm (`package-lock.json`)
**License:** **GNU Affero General Public License v3.0 only** (`hybrid-app/LICENSE`).

> Product framing (from its own README): offline-first hybrid strength + running tracker, Android-first, no accounts, no server, no cloud sync (`hybrid-app/README.md:5-12`, `:186-193`).

Maturity scale used here: **STUB** = placeholder/disabled; **PARTIAL** = works with a stated limit or subset; **COMPLETE** = end-to-end implementation with tests or shipped UI; **ABSENT** = no implementation found; **UNKNOWN** = cannot be determined from code.

## A. Product surface

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| UI | Four-destination SPA | Home, Train, Progress, Plans; Settings and Athlete Profile as overlays/subviews | COMPLETE | `hybrid-app/index.html:425`, `:546`, `:801`, `:1031`, `:1125`; nav `index.html:1875-1878` |
| UI | Decision-first Home | Today Start/Resume/Review card, seven-day strip, coach insight, In Focus chart | COMPLETE | `hybrid-app/js/home/today-card.js`; `hybrid-app/js/home/dashboard-model.js`; `hybrid-app/js/home/week-strip.js` |
| UI | Exercise library | 157-entry catalogue with muscle/equipment/category filters and exercise detail | COMPLETE | `hybrid-app/js/exercises/catalog.js:135` (157 `EXERCISES` entries); `hybrid-app/js/exercises/detail.js` |
| UI | Settings | One scrollable Settings page: profile, training, modules, program week, equipment, fasting, notifications, appearance, data, health, app | COMPLETE | `hybrid-app/index.html:1448-1780` |
| UI | Module switches | Hide Running, Fasting, Health Connect, Recovery & Load; strength is permanent; data retained | COMPLETE | `hybrid-app/js/modules.js:11-16`; `hybrid-app/index.html:1544-1563` |
| UI | Onboarding | Goal/level/equipment preferences, starter-program choice, provisional score | COMPLETE | `hybrid-app/js/onboarding.js`; `hybrid-app/js/onboarding/preferences.js`; `hybrid-app/js/onboarding/starter-programs.js` |
| UI | Athlete profile | Level/tier, lifetime totals, PR cards, shareable profile image | COMPLETE | `hybrid-app/js/athlete-profile.js:58-83`, `:425-426` |
| UI | Muscle coverage readout | Session recap estimates working-set credits per muscle; Home reports focus muscles covered | PARTIAL | `hybrid-app/js/session-recap.js:91-143`; `hybrid-app/js/analytics/volume-guide.js:45-81`; `hybrid-app/js/home.js:233` |
| UI | Trainer/community/admin screens | No routes, views or settings entries exist | ABSENT | only four nav destinations in `hybrid-app/index.html:1875-1878`; no `coach|trainer|community|admin` view container |
| UI | Gym check-in (QR/barcode) | No membership-card model or scanner | ABSENT | no `gymCards` key in `hybrid-app/js/state.js:44-66`; no barcode/QR dependency in `package.json` |
| Platform | Installable PWA + offline shell | Precache manifest generated into `sw.js`; app boots offline | COMPLETE | `hybrid-app/sw.js`; `hybrid-app/scripts/gen-precache.mjs`; `hybrid-app/README.md:36-38` |
| Platform | Android WebView shell | Bundled assets on a virtual HTTPS origin; native health, GPS, notifications, backup, export | COMPLETE | `hybrid-app/android/app/src/main/java/com/helyx/app/MainActivity.kt`; `TrustedOrigin.kt`; `hybrid-app/README.md:51-56` |
| Platform | iOS app / Apple Watch / Wear OS / Zepp / Garmin watch app | No iOS project or watch app exists | ABSENT | `hybrid-app/README.md:188-190` ("There is no iOS project"); no `ios/`, `wear/`, or watch source tree |
| Platform | Home-screen widgets / Live Activity | No widget or live-activity code | ABSENT | no `widget`/`Live Activity` source in `hybrid-app/android` or `js/` |
| Platform | Public demo/marketing site | Hosted preview of the same PWA; no separate marketing site | PARTIAL | `hybrid-app/README.md:5-8`; `hybrid-app/.github/workflows/pages.yml` |

## B. Domain model and persistence

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Domain | Single local state document | `currentWeek`, `activeProgramId`, `weeks`, `exerciseStats`, `customPrograms`, `customExercises`, `bodyWeightLog`, streak/goal/PR, load metrics, Health Connect series, wellness, fasting, program library | COMPLETE | `hybrid-app/js/state.js:44-66` |
| Domain | Schema migrations | Six migrations incl. v5→v6 equipment-profile seed; validates future/unknown versions | COMPLETE | `hybrid-app/js/state/migrations.js:312` (`CURRENT_SCHEMA_VERSION = 6`); `:441` (`migrateState`) |
| Domain | Workouts and weeks | Per-program-week day slots with logged sets, RPE, notes, run sessions and archived activations | COMPLETE | `hybrid-app/js/state.js:45-49`; `hybrid-app/js/state/run-sessions.js`; `hybrid-app/js/workout.js` |
| Domain | Exercise catalogue | 157 exercises with muscles, equipment, category, difficulty, instructions | COMPLETE | `hybrid-app/js/exercises/catalog.js:135-749` |
| Domain | Custom exercises/programs | User-created exercises and AI-free program builder with v1 bare-string lift shape | COMPLETE | `hybrid-app/js/state.js:48-49`; `hybrid-app/js/program_builder.js:1-5` |
| Domain | Equipment profiles | Per-profile equipment, band weights and kg/lb bar + plate setup; active profile projected onto legacy fields | COMPLETE | `hybrid-app/js/equipment-profiles.js:1-16`; `hybrid-app/js/state/migrations.js:299` |
| Domain | Bodyweight log | One entry per date, import merge never overwrites existing dates | COMPLETE | `hybrid-app/js/state.js:51`; `hybrid-app/js/portability/import-body-csv.js` |
| Domain | Fasting session | Active session, goal, history, metabolic zones and achievements | COMPLETE | `hybrid-app/js/state.js:61`; `hybrid-app/js/fasting.js:1-16` |
| Domain | Health Connect series | Steps, resting HR, HRV, sleep; per-field toggles and status | COMPLETE | `hybrid-app/js/state.js:59`; `hybrid-app/js/health/health-fields.js:33-40` |
| Domain | Server-side store / multi-device sync | No backend, auth, account or sync model | ABSENT | `hybrid-app/README.md:5-8`, `:186-189`; no `server`/`api` directory |
| Domain | Progress photos / body measurements | No photo store, measurement entities or comparison UI | ABSENT | no `measurements`/`photos` keys in `hybrid-app/js/state.js:44-66`; no photo view in `index.html` |
| Domain | Media store (exercise animations, user photos/videos) | No exercise media pipeline or user media store; catalogue is text only | ABSENT | `hybrid-app/js/exercises/catalog.js` contains no media refs; no `media` directory |

## C. Core workflows

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Workflow | Onboarding | No account; choose goal/level/equipment and a starter program, then land on Home | COMPLETE | `hybrid-app/js/onboarding.js`; `hybrid-app/js/state.js:796` (`onboardingComplete`) |
| Workflow | Strength logging | Start/resume a day, log weight/reps/RPE, warm-up/drop/AMRAP set types, supersets, rest timer, swaps, finish review | COMPLETE | `hybrid-app/js/workout.js`; `hybrid-app/js/workout/set-mutations.js:139-146`; `hybrid-app/js/workout/superset*`; `hybrid-app/js/workout/session-review.js:1-20` |
| Workflow | Running | Manual run entry, native GPS tracking with route map, splits, FIT import, run history | COMPLETE | `hybrid-app/js/gps-tracker.js:571-655`; `hybrid-app/js/garmin.js:1-71`; `hybrid-app/js/workout-map.js`; `hybrid-app/js/workout/run-logging.js` |
| Workflow | Saved-workout editing | Past sessions are read-only; no edit/move/backfill editor for finished workouts | ABSENT | no edit entry point in `hybrid-app/js/analytics.js` or `hybrid-app/js/session-recap.js`; no `editWorkout`/`session-edit` module |
| Workflow | Program catalogue | 58 catalogued strength/hypertrophy/running/hybrid programs with filters, bookmarks, completions and ratings | COMPLETE | `hybrid-app/js/programs/catalog.js:42`; `hybrid-app/js/state.js:62-69`; `hybrid-app/js/programs/library.js` |
| Workflow | Custom program builder | Schedule editor, progression tab (shape + coach style), preview, undo, import/export | COMPLETE | `hybrid-app/js/program_builder.js`; `hybrid-app/js/programs/editor-model.js`; `hybrid-app/js/programs/progression-style.js` |
| Workflow | Plan sharing / PDF print | No plan file export/import or print-to-PDF path | ABSENT | `hybrid-app/js/programs/program-export.js` emits Markdown text only; no print/share flow |
| Workflow | Import history | Clean-room OpenGym/Strong/Hevy workout CSV (strength only; cardio skipped), bodyweight CSV, Helyx JSON restore | PARTIAL | `hybrid-app/js/portability/import-workout-csv.js:1-10`; `hybrid-app/js/portability/import-body-csv.js`; `hybrid-app/js/state/import-export.js` |
| Workflow | Export and backup | JSON export, CSV export, Android app-private file mirror, user-chosen automatic backup folder | PARTIAL | `hybrid-app/js/portability/export-service.js`; `hybrid-app/js/portability/csv-export.js`; `hybrid-app/js/portability/auto-backup.js:85-187`; `hybrid-app/js/state/mirror.js:1-12` |
| Workflow | Share PR / profile image | Canvas share card via `navigator.share`, download fallback | COMPLETE | `hybrid-app/js/brain/pr-share.js:1-12`; `hybrid-app/js/athlete-profile.js:425-426` |
| Workflow | Notifications | Daily/weekly/streak/missed reminders; Android OS alarm survives background; in-session rest alerts | COMPLETE | `hybrid-app/js/notifications.js:1-12`; `hybrid-app/android/app/src/main/java/com/helyx/app/ReminderScheduler.kt:1-20`; `hybrid-app/js/timers.js` |
| Workflow | Journal / gym check-in / community | None of these surfaces exist | ABSENT | no views or state keys in `hybrid-app/index.html:425-1878`; `hybrid-app/js/state.js:44-66` |

## D. Training engine and analytics

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Engine | Progression styles | Double (default), Linear, Rep-first per custom program; RPE/fatigue/cut/stall safeguards | COMPLETE | `hybrid-app/js/programs/progression-style.js:1-45`; `hybrid-app/js/engine.js:294-390` |
| Engine | Weekly program progression | Per-week sets/reps/intensity modifiers, deload weeks, simple/advanced editor | COMPLETE | `hybrid-app/js/programs/progression.js`; `hybrid-app/js/program_builder.js` |
| Engine | Automatic deload on stall | Detects stalls but does not auto-generate a deload; surfaces a progress-check warning | PARTIAL | `hybrid-app/js/engine.js` plateau diagnostics; no deload generator in `js/programs/` |
| Engine | 1RM and PRs | Bounded Epley estimate (≤12 reps), PR detection, PR goals, finish review | COMPLETE | `hybrid-app/js/strength/e1rm.js:1-12`; `hybrid-app/js/workout/session-review.js`; `hybrid-app/js/engine.js` |
| Engine | Plate math | Greedy per-side breakdown from a stored bar/plate set; optional opt-in hints on barbell catalogue lifts | COMPLETE | `hybrid-app/js/workout/plates.js:1-25`; `hybrid-app/js/workout/plate-hint-dom.js`; `hybrid-app/js/equipment-profiles.js` |
| Engine | Plate inventory counts | No count per denomination; breakdown assumes enough of each plate | PARTIAL | `hybrid-app/js/workout/plates.js` header and greedy algorithm; no count field in `equipment-profiles.js` `plateSetup` |
| Engine | Automatic warm-up ramp | No generated warm-up sets; warm-ups are a manual set type | ABSENT | no `warmup-ramp`/generator module; set types in `hybrid-app/js/workout/set-mutations.js:146` |
| Engine | Effort logging | RPE/RIR per set with validity rules | COMPLETE | `hybrid-app/js/set-utils.js`; `hybrid-app/js/engine.js` |
| Engine | Supersets / drop sets / AMRAP | Superset grouping and rest-after-both; drop and AMRAP set types | COMPLETE | `hybrid-app/js/workout.js:661-712`; `hybrid-app/js/workout/set-mutations.js:139-146` |
| Engine | Per-side reps / timed holds | No per-side rep field or timed-set editor | ABSENT | no `perSide`/`duration` set fields in `hybrid-app/js/types.d.ts`; no timed-set UI in `hybrid-app/js/workout.js` |
| Engine | Machine stack / dumbbell inventory | Plate/bar only; no machine stack or dumbbell ladder model | ABSENT | `hybrid-app/js/equipment-profiles.js` equipment keys and `plateSetup` only |
| Analytics | Training load and ACWR | sRPE strength + run load, ATL/CTL, ACWR, weekly review | COMPLETE | `hybrid-app/js/metrics/training-load.js:1-20`; `hybrid-app/js/brain/weekly-review.js`; `hybrid-app/js/analytics/recovery-detail.js` |
| Analytics | Readiness | HRV/sleep/load/resting-HR/wellness weighted 0–100 score | COMPLETE | `hybrid-app/js/analytics/scoring/readiness-scoring.js:1-16`; `hybrid-app/js/home/dashboard-model.js:20` |
| Analytics | Running analytics | Run performance, splits, pace, period comparison, running detail | COMPLETE | `hybrid-app/js/analytics/run-performance.js`; `hybrid-app/js/analytics/running-detail.js`; `hybrid-app/js/gps-tracker.js` |
| Analytics | Strength analytics | Strength calendar/detail, volume guide, gym performance, e1RM trends | COMPLETE | `hybrid-app/js/analytics/strength-detail.js`; `hybrid-app/js/analytics/strength-volume-detail.js`; `hybrid-app/js/analytics/gym-performance.js` |
| Analytics | Muscle volume map / recovery map | No visual per-muscle volume/recovery map; a textual volume guide covers weekly sets against landmarks | PARTIAL | `hybrid-app/js/analytics/volume-guide.js:45-81`; `hybrid-app/js/session-recap.js:91-143`; no body-map renderer in `hybrid-app/js` |
| Analytics | Structural balance / strength levels / relative strength | None of these models exist | ABSENT | no `structural`/`strength-level`/`relative` modules in `hybrid-app/js` |
| Analytics | Lifetime totals | Sessions, volume, PR count and level on Athlete Profile | COMPLETE | `hybrid-app/js/athlete-profile.js:58-143` |
| Analytics | Streaks | Current/longest streak with freezes | COMPLETE | `hybrid-app/js/brain/streak.js:1-15` |
| Analytics | Challenges / Wrapped / progress photos | No challenge, yearly recap or photo timeline | ABSENT | no matching state keys in `hybrid-app/js/state.js:44-66`; no views |
| Analytics | Activity heatmap / calendar | Training and run calendars | COMPLETE | `hybrid-app/js/analytics/strength-calendar.js`; `hybrid-app/js/analytics/recovery-calendar.js`; `hybrid-app/js/home/activity-calendar.js` |

## E. Integrations

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Health | Health Connect (Android) | Read-only steps, resting HR, HRV, sleep; per-field toggles, contract shared JS↔Kotlin, background worker | COMPLETE | `hybrid-app/js/health/health-fields.js:1-40`; `hybrid-app/js/health/health-bridge.js`; `hybrid-app/android/app/src/main/java/com/helyx/app/HealthFieldContract.kt`; `HealthSyncWorker.kt` |
| Health | Apple Health | No iOS app or HealthKit bridge | ABSENT | `hybrid-app/README.md:188-190` |
| Health | Live per-set heart rate | No live HR during workouts | ABSENT | no heart-rate stream module in `hybrid-app/js`; Health Connect fields are daily series only |
| Import | Garmin FIT | FIT file import for runs with idempotent session identity | COMPLETE | `hybrid-app/js/garmin.js:1-71`; `hybrid-app/js/state/run-sessions.js:135` |
| Sharing | Strava / webhooks / calendar feed | No outbound integrations | ABSENT | no `strava`, `webhook` or ICS modules in `hybrid-app/js`; no server |
| Backup | WebDAV | No WebDAV client or scheduled off-device backup | ABSENT | no WebDAV code in `hybrid-app/js/portability` |
| Notify | Push notifications | No push service; reminders are local (Web Notifications or Android bridge) | ABSENT | `hybrid-app/js/notifications.js:5-9`; no push subscription code |
| Social | Trainer / community sharing | No multi-user features | ABSENT | no account or user model in `hybrid-app/js/state.js:44-66` |

## F. Accounts, API and AI

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Auth | Accounts / passkeys / OIDC / guest | No account system by design; onboarding only | ABSENT | `hybrid-app/README.md:5-8`, `:186-189` |
| Sync | Multi-device sync / conflict merge | None; JSON export/import and Android backups are the movement path | ABSENT | `hybrid-app/README.md:36-38`, `:186-189`; no sync module in `hybrid-app/js/state/` |
| API | HTTP API / OpenAPI / tokens | No server or public API | ABSENT | no `api`/`server` directory in `hybrid-app/` |
| AI | AI coach / MCP server | No LLM integration or MCP server | ABSENT | no `coach`/`mcp` modules or dependencies in `hybrid-app/package.json` |

## G. Non-functional

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Offline | PWA precache | Generated precache manifest; installable; offline boot | COMPLETE | `hybrid-app/sw.js`; `hybrid-app/scripts/gen-precache.mjs`; `hybrid-app/README.md:36-38` |
| Offline | Android durable mirror | App-private atomic JSON mirror; restores only when local copy is missing/older | COMPLETE | `hybrid-app/js/state/mirror.js:1-12`; `hybrid-app/android/app/src/main/java/com/helyx/app/StateMirrorBridge.kt` |
| Sync | Conflict resolution | No sync; last-write-wins by device/local save only | NOT APPLICABLE | `hybrid-app/README.md:186-189` |
| i18n | Localisation / RTL | English-only product strings; `toLocaleDateString` is used for dates but there is no locale pack system or RTL direction switch | ABSENT | no `locales`/`i18n` module in `hybrid-app/js`; literal English strings in `hybrid-app/index.html:1448-1780` |
| A11y | Touch targets, safe areas, modal focus | 44 px control checks, safe-area browser check, modal accessibility check, reduced-motion-aware UI | COMPLETE | `hybrid-app/scripts/touch-target-browser-check.mjs`; `scripts/safe-area-browser-check.mjs`; `scripts/modal-accessibility-check.mjs`; `hybrid-app/README.md:101-103` |
| Security | WebView hardening | Virtual HTTPS origin, bridge allowlists, disabled platform backup, sanitised state mirror/export | COMPLETE | `hybrid-app/android/app/src/main/java/com/helyx/app/TrustedOrigin.kt`; `BridgeSafe.kt`; `ExportSafe.kt`; `hybrid-app/docs/security/webview-threat-model.md` |
| Observability | Scrubbed crash reporting | Sentry with PII disabled and event/breadcrumb scrubbers | COMPLETE | `hybrid-app/js/monitoring/sentry.js:1-60`; `hybrid-app/js/monitoring/report-error.js` |
| Feature flags | Module switches | Four user modules; permanent strength core | COMPLETE | `hybrid-app/js/modules.js:11-16`; `hybrid-app/index.html:1544-1563` |
| Jobs | Background scheduling | Android AlarmManager daily reminder + reboot receiver; no server jobs | PARTIAL | `hybrid-app/android/app/src/main/java/com/helyx/app/ReminderScheduler.kt:1-25`; `hybrid-app/js/notifications.js:7-9` |

## H. DevEx and operations

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Tests | Unit and contract tests | 195 test files; `npm run verify` reports 1,810 passing tests | COMPLETE | `hybrid-app/tests/` (195 files); `hybrid-app/README.md:96-103` |
| Tests | Real-browser product checks | 34 Playwright checks incl. logging, analytics, a11y, safe area, offline, performance; parallel runner with 180 s watchdog | COMPLETE | `hybrid-app/scripts/run-browser-checks.mjs:1-47`; `hybrid-app/README.md:101-103` |
| Tests | Android verification | JVM unit tests, lint and debug assemble in CI | COMPLETE | `hybrid-app/.github/workflows/verify.yml`; `hybrid-app/README.md:107-112` |
| CI | Four workflows | CodeQL, verify (web + Android), Pages, signed release | COMPLETE | `hybrid-app/.github/workflows/` (`codeql.yml`, `verify.yml`, `pages.yml`, `release-aab.yml`) |
| Deploy | PWA hosting + signed APK/AAB | GitHub Pages; signed release build with keystore secrets | COMPLETE | `hybrid-app/.github/workflows/pages.yml`; `hybrid-app/.github/workflows/release-aab.yml` |
| API contract | OpenAPI/route parity | No HTTP API to document | NOT APPLICABLE | no `api` directory |
| Deploy | Docker / Helm / K8s | Not applicable to a local-first static PWA; no server image | NOT APPLICABLE | `hybrid-app/README.md:5-12` |

## Notable limits / unknowns

- **Health Connect is read-only and field-scoped by design**; it is not a two-way health integration like openGym's. This is a deliberate privacy choice (`health-fields.js:6-18`).
- **No server means several openGym features are architecturally not applicable** (accounts, sync, trainers, community, webhooks, calendar feed, API tokens, MCP). They should not be scored as missing features in the same sense as on-device capabilities.
- **Fasting, live GPS tracking, FIT import and hybrid run+strength load are genuine Helyx strengths** that openGym does not implement (see `01-reference-inventory.md`, "Capabilities openGym does not implement").
- **Saved-workout editing:** the current code has no past-session editor; this is confirmed by absence of an edit module and a read-only History surface. **UNKNOWN — needs human verification** whether a hidden/experimental path exists outside the scanned entry points.
- **Crash reporting endpoint:** Sentry initialisation is guarded and DSN-driven (`sentry.js:46-60`); the production DSN/transport is **UNKNOWN — needs human verification**.
