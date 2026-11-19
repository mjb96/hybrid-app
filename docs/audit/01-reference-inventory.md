# 01 — Reference inventory: openGym

> **Name note:** this inventory was captured while our project was named **Helyx**. It is now **openHybrid**; the evidence paths are unchanged.

**Audit date:** 2026-11-19
**Clone:** `/private/var/folders/6f/xfbl97yn6550ff51rv25yq5h0000gn/T/opencode/audit/openGym`
**Commit:** `e4a68a94c42a3c17cbd560d66ce2e46a7048ab99`
**Primary languages:** JavaScript/JSX (1,208 `.js` + 549 `.jsx`), Swift (81), Java (82), Kotlin (30), Monkey C (Garmin), Lua (Zepp OS)
**Frameworks:** React 19 + Vite + React Router + Zustand; Capacitor 7 (Android/iOS); plain `node:http` API; Vitest + fast-check; MCP SDK
**Package manager:** npm (`package-lock.json`; root, `api`, `frontend`, `mcp`, `watch-zepp`)
**License:** **GNU AGPL-3.0** (`openGym/LICENSE:1`). Exercise media is separately licensed from Gym visual and is **not** AGPL (`openGym/NOTICE.md:48-60`, `openGym/README.md:382-392`).

> Product framing (from its own README): self-hosted gym tracker with a server, passkeys, multi-device sync, native phone/watch apps, and optional AI coach/MCP/trainer/community features (`openGym/README.md:32-44`).

Maturity scale used here: **STUB** = placeholder/disabled; **PARTIAL** = works with a stated limit or beta label; **COMPLETE** = end-to-end implementation with tests or shipped UI; **ABSENT** = no implementation found; **UNKNOWN** = cannot be determined from code.

## A. Product surface

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| UI | Hash-routed SPA with 20+ screens | Home, Plan, Routine edit, Programmes, Workout, Stats, History, Library, Muscles, Community, Structural balance, Tools, Journal, Photos, Measurements, Settings, Check-in, Coach, Trainer, Admin | COMPLETE | `openGym/frontend/src/App.jsx:398-438` |
| UI | Bottom navigation + modal sheets | Tab bar and shared bottom-sheet system for pickers, editors and confirmations | COMPLETE | `openGym/frontend/src/components/TabBar.jsx`; `openGym/frontend/src/sheets.jsx` |
| UI | Settings with search and sub-pages | `/settings/:page`; searchable settings index; integrations, account, data, modules | COMPLETE | `openGym/frontend/src/App.jsx:422-423`; `openGym/frontend/src/views/settings-pages.js` |
| UI | Exercise library | 6,554 catalogue exercise JSON files, search, muscle/equipment filters, cards/list | COMPLETE | `openGym/catalogue/exercises/` (6,554 `*.json`); `openGym/frontend/src/views/Library.jsx:1` |
| UI | Muscle explorer and body map | Browse by muscle, lit body map for sessions and volume/recovery/untrained modes | COMPLETE | `openGym/frontend/src/views/Muscles.jsx:1-12`; `openGym/frontend/src/components/BodyMap.jsx` |
| UI | Public community library | Share/import routines, exercises and items on one server; consent per item; report | COMPLETE | `openGym/frontend/src/views/Community.jsx:1-14`; route `App.jsx:412` |
| UI | Trainer and gym-lead dashboards | Roles, scopes, member list, gym view, requests, gym join codes | COMPLETE | `openGym/frontend/src/views/Trainer.jsx:1-12`; `openGym/docs/TRAINERS.md:1-40` |
| UI | Admin dashboard | Users, invites, roles, data view, audit log, shared-library moderation, coach config | COMPLETE | `openGym/frontend/src/views/Admin.jsx`; `openGym/frontend/src/views/AdminCoach.jsx`; route `App.jsx:433` |
| UI | Gym check-in | Membership cards as QR/barcode, add by type/photo/scan, NFC stickers | COMPLETE | `openGym/frontend/src/views/CheckIn.jsx:1-14`; `openGym/docs/MODULES.md:25` |
| Platform | Installable PWA + offline shell | Service worker caches shell network-first, media cache-first with LRU caps | COMPLETE | `openGym/frontend/public/sw.js:1-45`; `openGym/frontend/public/manifest.json` |
| Platform | Android app | Capacitor Android shell with native plugins (health, alarms, widgets, watch) | COMPLETE | `openGym/frontend/package.json` (`@capacitor/android`); `openGym/docs/ARCHITECTURE.md:7-10` |
| Platform | iPhone/iPad app | Capacitor iOS shell, HealthKit, widgets, Live Activity, Apple Watch | COMPLETE | `openGym/docs/ARCHITECTURE.md:7-10`, `:136-147`; `openGym/README.md:208-221` |
| Platform | Apple Watch app | Crown set ticking, RPE/RIR, rest countdown, per-set heart rate, lock | COMPLETE | `openGym/docs/ARCHITECTURE.md:136-141`; `openGym/README.md:112-124` |
| Platform | Wear OS watch app | Compose for Wear OS; **beta** since v1.4.4, closed testing | PARTIAL | `openGym/docs/WEAR_OS.md:8-11`; `openGym/frontend/android/wear/src/main/java/ch/duartesantos/opengym/wear/WearListener.kt` |
| Platform | Zepp OS watch app | Separate Zepp app with pages/widgets/settings, shared logic | COMPLETE | `openGym/watch-zepp/`; `openGym/docs/ZEPP_OS.md` |
| Platform | Garmin Connect IQ app | Monkey C app with CI sanity checks; SDK build needs Garmin login | COMPLETE | `openGym/frontend/garmin/source/App.mc`; `openGym/frontend/garmin/check.mjs:1-12`; `openGym/docs/GARMIN.md` |
| Platform | Widgets and Live Activity | iOS widgets/Live Activity, Android home-screen widget, deep links | COMPLETE | `openGym/docs/ARCHITECTURE.md:143-147` |
| Platform | Demo and marketing site | In-browser demo with seeded data; plain-HTML website | COMPLETE | `openGym/frontend/src/lib/demo.js`; `openGym/website/` |

## B. Domain model and persistence

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Domain | Profile document | Routines, workouts, bodyweight, measurements, programmes, queue/rotation, equipment profiles, plates/dumbbells/stacks, gym cards, notes, activities, custom exercises, settings | COMPLETE | `openGym/frontend/src/store/useStore.js:85-260` |
| Domain | Workout model | Sets with weight/reps/time/distance, warm-up/drop/rest-pause tags, supersets, per-side, RPE/RIR, notes, media, PR flags | COMPLETE | `openGym/frontend/src/lib/workout-model.js`; `openGym/frontend/src/lib/per-set.js`; `openGym/frontend/src/lib/superset-meta.js` |
| Domain | Exercise catalogue | One JSON per exercise with muscles, equipment, instructions, translations; 180 px media | COMPLETE | `openGym/catalogue/`; `openGym/docs/ARCHITECTURE.md:149-174` |
| Domain | Equipment inventory | Per-gym profiles with plates, dumbbells, bar defaults and machine stack weights; top-level fields mirror the active gym | COMPLETE | `openGym/frontend/src/lib/gym-inventory.js:1`; `openGym/docs/ARCHITECTURE.md:105-113` |
| Domain | Body data | Weigh-ins with goal corridor, measurements incl. custom fields and blood pressure, progress photos with EXIF dating | COMPLETE | `openGym/frontend/src/lib/bodyweight.js`; `openGym/frontend/src/lib/measurements.js`; `openGym/frontend/src/views/ProgressPhotos.jsx:1-20` |
| Domain | Programmes | Built-in and editable multi-week programmes with days/weeks; starting writes the weekly plan/rotation | COMPLETE | `openGym/frontend/src/lib/programmes.js`; `openGym/frontend/src/views/Programmes.jsx:1-4` |
| Domain | Scheduling | Weekday plan, pinned/moved sessions, rest days, rotation (A/B/C), floating week queue | COMPLETE | `openGym/frontend/src/lib/rotation.js`; `openGym/frontend/src/lib/queue.js`; `openGym/frontend/src/lib/day-sessions.js` |
| Domain | Session targets | External/coach-written exact rows per scheduled session, stamped and merged per id | COMPLETE | `openGym/docs/dev/SESSION_TARGETS.md:1-30`; `openGym/frontend/src/lib/session-targets.js` |
| Domain | Server store | `db.json` for users/passkeys/invites/push; per-profile `state-<uid>.json`; atomic temp-file rename | COMPLETE | `openGym/docs/ARCHITECTURE.md:120-127`; `openGym/api/durable.js` |
| Domain | Sync revisions and field stamps | Revision + `baseRev`; 409 on conflict; per-field/per-entry stamps; deletions stay deleted | COMPLETE | `openGym/docs/ARCHITECTURE.md:156-175`; `openGym/frontend/src/lib/sync-merge.js:1-60`; `openGym/api/sync-stamps.js` |
| Domain | Media store | Content-hashed uploads, signed-in access, missing/sweep endpoints, client-side shrink/EXIF strip | COMPLETE | `openGym/api/media.js`; `openGym/frontend/src/lib/media-store.js`; `openGym/api/openapi.yaml:2463-2679` |

## C. Core workflows

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Workflow | Onboarding and sign-in | Create profile, passkey (WebAuthn), optional password, guest mode, invite-only | COMPLETE | `openGym/frontend/src/views/Login.jsx`; `openGym/api/passkeys-store.js`; `openGym/README.md:99-111` |
| Workflow | Device pairing | One-time code/QR grants a phone a bearer session | COMPLETE | `openGym/api/device-link.js`; `openGym/frontend/src/views/Connect.jsx`; `openGym/docs/ARCHITECTURE.md:129-131` |
| Workflow | OIDC sign-in | Optional identity provider sign-in | COMPLETE | `openGym/frontend/src/views/Login.oidc.test.jsx`; `openGym/frontend/src/lib/oidc.js`; `openGym/api/oidc/` |
| Workflow | Guided workout | Start today's session, prefill last weights, rest timer, live PRs, next-session messaging on rest days | COMPLETE | `openGym/frontend/src/views/Workout.jsx`; `openGym/frontend/src/lib/session-start.js`; `openGym/README.md:64-83` |
| Workflow | Set interactions | Swipe delete/copy with undo, pyramid sets, per-set rest, scroll-wheel rest up to 15 min, set notes | COMPLETE | `openGym/README.md:73-79`; `openGym/frontend/src/views/Workout.swipe.test.jsx`; `openGym/frontend/src/lib/pyramid.js` |
| Workflow | Exercise substitution | Backup exercise swaps into the slot keeping sets/reps | COMPLETE | `openGym/frontend/src/lib/active-exercise-swap.js`; `openGym/frontend/src/lib/exercise-substitutes.js` |
| Workflow | Saved-workout editing | Edit a finished workout, log a paper workout, move it to another date, recompute records | COMPLETE | `openGym/frontend/src/lib/session-edit.js`; `openGym/frontend/src/views/History.jsx`; `openGym/README.md:93-97` |
| Workflow | Plan sharing | Export a plan file, import it, print to PDF | COMPLETE | `openGym/frontend/src/lib/plan-share.js`; `openGym/frontend/src/components/RoutineShare.jsx`; `openGym/docs/DATA_IMPORTS.md:1-12` |
| Workflow | Import history | FitNotes, Strong, Hevy, Gravl, Liftosaur (CSV+JSON), Liftoff, StrongLifts, Fitbod, JEFIT, Apple Health, generic CSV/JSON | COMPLETE | `openGym/docs/DATA_IMPORTS.md:24-40`; `openGym/frontend/src/lib/import-csv.js`; `openGym/frontend/src/lib/import-apps.js`; `openGym/frontend/src/lib/import-hevy.js` |
| Workflow | Export and backup | JSON backup, CSV of sets/weigh-ins/measurements, zip with photos/videos, daily WebDAV backup + restore/merge | COMPLETE | `openGym/frontend/src/lib/export-csv.js`; `openGym/frontend/src/lib/zip.js`; `openGym/docs/WEBDAV_BACKUP.md:1-40` |
| Workflow | Gym check-in | Store membership codes, render QR/barcode, add by photo/scan, NFC | COMPLETE | `openGym/frontend/src/views/CheckIn.jsx:1-14`; `openGym/frontend/src/lib/nfc.js` |
| Workflow | Journal | Notes across days, exercises and gyms with folders and filters | COMPLETE | `openGym/frontend/src/views/Journal.jsx:1-12`; `openGym/frontend/src/lib/journal.js` |
| Workflow | Calculators | 1RM formulas, plate grid, strength level, relative strength, unit conversion | COMPLETE | `openGym/frontend/src/views/Tools.jsx:1-15`; `openGym/frontend/src/lib/onerm.js`; `openGym/frontend/src/lib/strength-level.js` |

## D. Training engine and analytics

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Engine | Progression policies | Off, linear, Greyskull, double, steady double, triple, undulating, density, ladder, time; per-routine or per-exercise; deload on stalls | COMPLETE | `openGym/frontend/src/lib/progression.js:29-68`; `openGym/README.md:84-90` |
| Engine | Deloads | Planned deload weeks, automatic deload after repeated misses, selectable deload target | COMPLETE | `openGym/frontend/src/lib/deload-cycle.js`; `openGym/docs/dev/DELOAD_WEEKS.md`; `openGym/frontend/src/lib/progression.js:158-232` |
| Engine | 1RM and records | Epley estimate per exercise, best e1RM, PR detection during and after sessions | COMPLETE | `openGym/frontend/src/lib/onerm.js`; `openGym/frontend/src/lib/set-records.js`; `openGym/frontend/src/lib/finish-workout.js` |
| Engine | Warm-ups | Automatic warm-up ramp, configurable per exercise and module | COMPLETE | `openGym/frontend/src/lib/warmup-ramp.js`; `openGym/frontend/src/lib/session-start.js:18`; `openGym/docs/MODULES.md:21` |
| Engine | Plate math | Per-gym plate inventory, bar types, per-side loading, machine stacks, dumbbell pair/total semantics | COMPLETE | `openGym/frontend/src/lib/plates.js`; `openGym/frontend/src/lib/bar.js`; `openGym/frontend/src/lib/dumbbells.js`; `openGym/frontend/src/lib/machine-kinds.js` |
| Engine | Timed and distance work | Holds, carries, cardio by time/speed/distance, per-set duration | COMPLETE | `openGym/frontend/src/lib/per-set.js`; `openGym/frontend/src/lib/cardio-kind.js`; `openGym/frontend/src/views/Workout.distance.test.jsx` |
| Analytics | Exercise progress | Per-exercise chart, day list, effort overlay, trend | COMPLETE | `openGym/frontend/src/views/Stats.jsx`; `openGym/frontend/src/lib/set-trend.js` |
| Analytics | Muscle volume and recovery | Volume by muscle, fatigue/recovery map, untrained muscles, 7/28-day acute:chronic model | COMPLETE | `openGym/frontend/src/lib/recovery.js:1-40`; `openGym/frontend/src/views/Muscles.jsx`; `openGym/frontend/src/views/Stats.jsx:220` |
| Analytics | Structural balance | Poliquin/Thibaudeau/ATG ratios with templates, overrides and status | COMPLETE | `openGym/frontend/src/views/StructuralBalance.jsx:1-16`; `openGym/frontend/src/lib/structuralBalance.js` |
| Analytics | Body-weight goal corridor | Chart with goal line, weekly rate, lose/gain/hold corridor | COMPLETE | `openGym/frontend/src/lib/bodyweight.js`; `openGym/frontend/src/views/Stats.bodyweight.test.jsx` |
| Analytics | Lifetime volume and relative strength | Running total lifted, lifts as % body weight | COMPLETE | `openGym/frontend/src/lib/lifetime.js`; `openGym/frontend/src/lib/relative-strength.js`; `openGym/README.md:95-97` |
| Analytics | Activity heatmap | Year-long heatmap with time/sets metric | COMPLETE | `openGym/frontend/src/views/Stats.jsx`; `openGym/frontend/src/lib/report.js:112`; `openGym/frontend/src/lib/history.js` |
| Analytics | Strength levels | Standards by sex/bodyweight/age with level card | COMPLETE | `openGym/frontend/src/lib/strength-level.js`; `openGym/docs/MODULES.md:22` |
| Motivation | Streaks, challenges, recap, Wrapped | Week streak, monthly challenges/trophies, week/month recap, yearly Wrapped share cards | COMPLETE | `openGym/frontend/src/lib/streak.js`; `openGym/frontend/src/lib/challenges.js`; `openGym/frontend/src/lib/wrapped.js`; `openGym/docs/MODULES.md:28` |
| Motivation | Seasonal themes and advent | Halloween/Christmas themes and advent calendar, module-gated | COMPLETE | `openGym/docs/MODULES.md:31`; `openGym/frontend/src/lib/seasonal.js`; `openGym/frontend/src/lib/advent.js` |

## E. Integrations

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Health | Apple Health (iPhone) | Workouts/weigh-ins out; heart rate/weight in; per-set HR | COMPLETE | `openGym/docs/INTEGRATIONS.md:9`; `openGym/frontend/src/lib/health-sync.js` |
| Health | Health Connect (Android) | Same two-way flow; vitals read (steps, RHR, HRV, sleep) | COMPLETE | `openGym/docs/INTEGRATIONS.md:10`; `openGym/frontend/src/lib/health-sync.js:289-337` |
| Health | Vitals and readiness | Steps, resting HR, HRV, sleep feed recovery tips | COMPLETE | `openGym/frontend/src/lib/vitals.js`; `openGym/docs/MODULES.md:27` |
| Health | Live heart rate | Watch heart rate per set during a workout | COMPLETE | `openGym/frontend/src/lib/heart-rate.js`; `openGym/docs/README.md` (Health section) |
| Import | Hevy API import | One-off Hevy Pro API-key import | COMPLETE | `openGym/docs/DATA_IMPORTS.md`; `openGym/frontend/src/lib/import-hevy.js` |
| Sharing | Strava | Optional upload of finished cardio/strength workouts via a server-side Strava app | COMPLETE | `openGym/docs/INTEGRATIONS.md:16`; `openGym/api/integrations/` |
| Sharing | Webhooks | Signed `workout.finished` / `workout.pr` / `weighin.logged` with retries, outbox, pause, last-50 log, 10/profile | COMPLETE | `openGym/docs/INTEGRATIONS.md:17`, `:60-90`; `openGym/api/integrations/`; `openGym/api/integrations/outbox.js` |
| Sharing | Calendar feed (ICS) | Tokenized private ICS of planned sessions + optional 90-day finished workouts | COMPLETE | `openGym/docs/CALENDAR.md:1-40`; `openGym/api/integrations/calendar.js` |
| Backup | WebDAV daily backup | Device-to-WebDAV daily copy, restore/merge, 14-day retention | COMPLETE | `openGym/docs/WEBDAV_BACKUP.md:1-40`; `openGym/frontend/src/lib/webdav.js` |
| Notify | Web push | Per-device push subscriptions, VAPID keys, push on reminders | COMPLETE | `openGym/api/push-messages.js`; `openGym/frontend/src/lib/push.js`; `openGym/README.md` config table |
| Notify | Local reminders and alarms | Workout reminder, missed-workout nudge, rest-timer alarm, check-in reminder, gym geofence once/day | COMPLETE | `openGym/frontend/src/lib/nudge.js`; `openGym/frontend/src/lib/rest-alert.js`; `openGym/frontend/src/lib/gym-reminder.js`; `openGym/frontend/src/views/GymReminder.jsx:1-10` |
| Social | Trainer/gym sharing | Per-category See/Suggest/Apply consent, codes, inbox, undo, gym leads, sharing log | COMPLETE | `openGym/docs/TRAINERS.md:1-40`; `openGym/frontend/src/views/MyTrainer.jsx:1-9`; `openGym/api/permissions.js` |

## F. Accounts, API and AI

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Auth | Passkeys + passwords + guest + OIDC | WebAuthn passkeys, optional password, guest mode, OIDC, session cookies/bearer | COMPLETE | `openGym/api/passkeys-store.js`; `openGym/api/password.js`; `openGym/api/oidc/`; `openGym/README.md:99-111` |
| Auth | Invites, admin roles, audit log | First-user admin, invite-only, role changes, sign-in/action audit with retention/IP modes | COMPLETE | `openGym/api/server.js`; `openGym/api/server.js:1065-1083`; `openGym/README.md` config table |
| API | OpenAPI-documented HTTP API | 153 `/api/*` paths; route/spec parity test | COMPLETE | `openGym/api/openapi.yaml`; `openGym/api/test/openapi-routes.test.js` |
| API | Scoped API tokens | Per-category Off/See/Change, SHA-256 storage, budgets, expiry, revocation, audit | COMPLETE | `openGym/docs/API_TOKENS.md:1-60`; `openGym/api/tokens.js`; `openGym/api/trainers/scopes.js` |
| AI | Coach | Provider-agnostic plan drafting/revision/chat, approval flow, intake, consent, scheduled reviews, on-device mode | COMPLETE | `openGym/docs/AI_COACH.md:1-70`; `openGym/frontend/src/views/CoachChat.jsx`; `openGym/api/coach/` |
| AI | MCP server | Local stdio + remote HTTP with scoped tools to read history and log workouts | COMPLETE | `openGym/mcp/src/index.js:1-12`; `openGym/docs/MCP_REMOTE.md` |
| AI | Routines library index | Remote routine index the Coach can offer/import | COMPLETE | `openGym/docs/ROUTINES_LIBRARY.md:1-40`; `openGym/api/coach/core/routine-library.js` |

## G. Non-functional

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Offline | PWA service worker | Shell network-first, hashed build cache, media LRU (150 MB/3,000 items), lazy assets | COMPLETE | `openGym/frontend/public/sw.js:1-45` |
| Offline | Phone file mirror | State mirrored to a native file when WebView storage is evicted; manual/auto backup | COMPLETE | `openGym/docs/ARCHITECTURE.md:100-103`; `openGym/frontend/src/lib/mobile.js` |
| Sync | Conflict resolution | 409 + field-level merge, stamps down to one setting/field, deletion tombstones | COMPLETE | `openGym/frontend/src/lib/sync-merge.js:1-60`; `openGym/docs/ARCHITECTURE.md:156-175` |
| i18n | 25 locale packs + English source keys | RTL Arabic/Persian, Traditional Chinese, exercise names/instructions translated; locale sync check in CI | COMPLETE | `openGym/frontend/src/locales/` (25 files); `openGym/README.md:108`; `openGym/.github/workflows/test.yml:176-177` |
| A11y | Focus trap, accessible names, bidi | Modal focus trap, a11y-name helper, bidi isolation for mixed-direction text | COMPLETE | `openGym/frontend/src/lib/focus-trap.js`; `openGym/frontend/src/lib/a11y-name.js`; `openGym/frontend/src/lib/bidi.js` |
| Security | Origin/net guards, rate limits, sealed secrets | Passkey origin checks, SSRF guard for webhooks, token/rate budgets, AES-GCM sealed tokens | COMPLETE | `openGym/api/origin.js`; `openGym/api/net-guard.js`; `openGym/api/rate-limit.js`; `openGym/api/integrations/crypto.js` |
| Observability | Audit log + in-app network log | Admin activity log; Network log screen for sync diagnostics | COMPLETE | `openGym/api/server.js:1065-1083`; `openGym/frontend/src/views/NetworkLog.jsx` |
| Feature flags | Modules and build channels | 12 user modules with presets; server env config; APK/store/demo channels | COMPLETE | `openGym/docs/MODULES.md:12-50`; `openGym/frontend/src/lib/channel.js`; `openGym/frontend/src/lib/modules.js` |
| Jobs | Background queues/outbox | Coach jobs, integration outbox with idempotency/backoff, push delivery | COMPLETE | `openGym/api/coach/jobs.js`; `openGym/api/integrations/outbox.js`; `openGym/api/queue.js` |

## H. DevEx and operations

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Tests | Unit/property/component coverage | 893 frontend tests, 131 API tests, 8 MCP tests; Vitest + fast-check; test-audit gate | COMPLETE | `find openGym/frontend/src -name '*.test.js*'` = 893; `openGym/.github/workflows/test.yml:157-203` |
| CI | Multi-workflow pipeline | Tests, iOS build/tests, catalogue, pages/demo, Docker publish, CLA, audit, GitLab mirror | COMPLETE | `openGym/.github/workflows/` (9 workflows) |
| API contract | OpenAPI route parity | Test fails when `server.js` routes and `openapi.yaml` disagree | COMPLETE | `openGym/api/test/openapi-routes.test.js` |
| Deploy | Docker Compose / Helm / K8s / Nix | Self-host images, compose file, helm chart, kubernetes manifests, Nix flake | COMPLETE | `openGym/docker-compose.yml`; `openGym/helm/`; `openGym/kubernetes/`; `openGym/contrib/nix/` |
| Data | Demo seed | Seeded demo profile for the public demo and screenshots | COMPLETE | `openGym/frontend/src/lib/demoSeed.js` |
| Catalogue | Generated exercise assets | Build script generates names/descriptions/instructions/media indexes | COMPLETE | `openGym/scripts/catalogue/build.mjs`; `openGym/docs/ARCHITECTURE.md:29-33` |

## Capabilities openGym does **not** implement (useful for the reverse comparison)

| Layer | Capability | Behavior | Maturity | Evidence |
|---|---|---|---|---|
| Running | Live GPS run tracking with route map | No `navigator.geolocation` usage found; activities/runs come from health stores, imports or manual entry | ABSENT | no matches for `navigator.geolocation` under `openGym/frontend/src`; `openGym/frontend/src/lib/activities.js:1-20` |
| Running | FIT-file import | Import formats are CSV/JSON/Apple Health XML/Hevy API; no FIT parser found | ABSENT | `openGym/docs/DATA_IMPORTS.md:24-40`; no `*.fit` parser in `openGym/frontend/src/lib` |
| Fasting | Fasting timer/protocols/insights | No fasting feature in routes, store keys or docs | ABSENT | `openGym/frontend/src/App.jsx:398-438`; `openGym/frontend/src/store/useStore.js:85-260`; no `fasting` key in `DEF` |
| Body | Android system Health Connect **read-only** field contract | openGym reads/writes health more broadly; no per-field read-only contract | NOT APPLICABLE | `openGym/frontend/src/lib/health-sync.js` |

## Notable limits / unknowns

- **Wear OS is beta** and in closed testing (`docs/WEAR_OS.md:8-11`), so parity claims for it should be treated as partial.
- **Monetisation/subscriptions:** no billing/payment code was found in `api/` or `frontend/` dependencies. This is **UNKNOWN — needs human verification**; absence from the scanned package files is not proof there is no hosted paid tier.
- **Scale guarantees:** no load-test artifacts were found. Performance claims in the README (large histories, sync) are **UNKNOWN — needs human verification**; the model tests exercise large histories but do not establish server concurrency limits.
- **Exercise media licensing:** the 6,554-exercise catalogue text is AGPL, but the stills/animations are licensed only for openGym (`NOTICE.md:48-60`). Neither can be copied into Helyx as-is.
