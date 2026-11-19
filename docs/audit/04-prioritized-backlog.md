# 04 — Prioritized backlog

**Scoring**
- **User value (1–5):** who benefits and how often, inferred from openGym's UI prominence (nav/route vs settings-only vs optional), docs emphasis, and whether the gap blocks a common task.
- **Strategic fit (1–5):** how well it serves Helyx's stated purpose: offline-first, local data ownership, hybrid strength + running, Android-first (`hybrid-app/README.md:5-12`, `:22-56`).
- **Effort:** **S** ≈ one small PR / ≤5 files; **M** ≈ 2–3 PRs / 5–15 files, maybe a migration; **L** ≈ multi-sprint / >15 files or new storage/network platform.
- **Risk:** licence, data migration, derived-stat correctness, new permissions/secrets, privacy.

All work is **clean-room**; no openGym code or Gym visual media may be copied (see `03-gap-matrix.md` licence warning).

## Scores

| # | Gap | UV | SF | Effort | Risk | Rank |
|---|---|---|---|---|---|---|
| 1 | Plate inventory counts | 3 | 5 | S | Low (v7 migration) | **NOW** |
| 2 | Dumbbell + machine-stack inventory | 4 | 5 | M | Low–Med (v7 schema) | **NOW** |
| 3 | Automatic warm-up ramp | 4 | 4 | S | Low | **NOW** |
| 4 | Muscle volume / recovery map | 4 | 5 | M | Low (model accuracy) | **NOW** |
| 5 | Bodyweight goal corridor | 3 | 4 | S | Low | **NOW** |
| 6 | Export breadth (bodyweight + future measurements) | 3 | 5 | S | Low | **NOW** |
| 7 | Saved-workout editing | 5 | 4 | L | High (recompute PRs/stats) | **NEXT** |
| 8 | Rotation + floating queue | 4 | 4 | M | Medium (scheduling model) | **NEXT** |
| 9 | Progression breadth (Triple, Greyskull) | 4 | 4 | M | Low | **NEXT** |
| 10 | Per-side reps + timed holds | 4 | 4 | M | Medium (set model) | **NEXT** |
| 11 | Import breadth (FitNotes, Liftosaur, Gravl, …) | 4 | 5 | M | Medium (hostile files) | **NEXT** |
| 12 | Plan sharing file + PDF | 4 | 4 | S–M | Low | **NEXT** |
| 13 | Body measurements | 3 | 4 | M | Low (v8 migration) | **NEXT** |
| 14 | Strength levels | 3 | 4 | S–M | Low (standards choice) | **NEXT** |
| 15 | WebDAV off-device backup | 4 | 5 | M | Medium (secrets/network) | **NEXT** |
| 16 | Per-set rest / pyramids / rest-pause | 3 | 4 | M | Low | **NEXT** |
| 17 | Searchable journal | 3 | 4 | S–M | Low | **NEXT** |
| 18 | ICS calendar export | 3 | 4 | S | Low | **NEXT** |
| 19 | Progress photos + compare | 3 | 2 | L | High (privacy/storage) | **LATER** |
| 20 | Monthly challenges + trophies | 3 | 3 | M | Low | **LATER** |
| 21 | Yearly Wrapped | 3 | 3 | M | Low | **LATER** |
| 22 | Structural balance | 2 | 3 | M | Low | **LATER** |
| 23 | Android home-screen widget | 3 | 4 | M | Low | **LATER** |
| 24 | Gym geofence reminder | 2 | 2 | M | High (battery/privacy) | **LATER** |
| 25 | Strava / GPX-FIT share-out | 3 | 3 | M | Medium (OAuth/secrets) | **LATER** |
| 26 | Exercise catalogue text expansion | 5 | 4 | M | Medium (sourcing) | **LATER** |
| 27 | Exercise animations | 5 | 4 | L | **Blocked** (Gym visual licence) | **DROP unless licensed** |
| 28 | Internationalisation / RTL | 4 | 2 | L | High (55k lines) | **LATER** |
| 29 | Tools/calculator screen | 2 | 2 | S | Low | **DROP** (embedded math is enough) |
| 30 | Seasonal themes / advent | 1 | 1 | S | Low | **DROP** |
| 31 | Gym check-in QR/barcode/NFC | 2 | 1 | M | Medium (camera/NFC perms) | **DROP** (peripheral) |
| 32 | Live per-set heart rate | 3 | 3 | M | Medium (health permissions) | **LATER** |

## NOW — next sprint

### 1 + 2. Equipment inventory: plate counts, dumbbell ladders, machine stacks (one slice)

**Why now.** Helyx already owns the equipment-profile model and is the only one of the two apps with per-profile bar/plate setup. The missing half is *availability*: `computePlateBreakdown` assumes unlimited plates (`hybrid-app/js/workout/plates.js`), and dumbbell/machine targets round by a generic increment. This is the highest strategic fit in the audit — offline, local, and directly improves every barbell/dumbbell/machine session.

**Shape.** Schema v7 adds counts per plate denomination and optional dumbbell/stack lists to `settings.equipmentProfiles[].plateSetup` / new inventory fields. `plates.js` returns `exact:false` plus "needs N more" when the rack cannot build the target; hints become honest. Settings gets count steppers and a dumbbell/stack editor. Migration seeds "unlimited" from today's behaviour so no existing profile changes meaning.

**Depends on:** nothing. **Tests:** plate math availability cases, migration v6→v7, browser check for the Settings editor.

### 3. Automatic warm-up ramp

**Why now.** Small, high-frequency, and it removes arithmetic from every session. openGym generates ramp sets at session start and lets the lifter edit them (`openGym/frontend/src/lib/warmup-ramp.js`; `openGym/frontend/src/lib/session-start.js:18`). Helyx has the warm-up set type but no generator.

**Shape.** Pure `js/workout/warmup-ramp.js` (percentage/rep ladder from the working weight), seeded into `set-plan.js` as normal warm-up rows, editable in the cockpit. No schema change; generated rows are ordinary sets. Add a per-exercise "auto warm-up" toggle if the ramp should be optional.

**Depends on:** nothing. **Tests:** pure ramp model, cockpit/browser check, CSV export unaffected.

### 4. Muscle volume / recovery map

**Why now.** This is Helyx's differentiator — hybrid strength + running load — and it already has the inputs: `volume-guide.js` credits direct/indirect sets, `catalog.js` has muscle metadata, and `training-load.js` knows the week. What is missing is the per-muscle picture openGym shows (`openGym/frontend/src/lib/recovery.js:1-40`). Build the model, not a copied body drawing.

**Shape.** New pure model under `js/analytics/` that maps sets/runs to muscles and buckets volume/recovery/untrained; a Progress card and either a new body diagram or a per-muscle heat list. Keep the "estimate, not diagnosis" language.

**Depends on:** nothing, but benefits from per-side/timed set validity later. **Tests:** model fixtures across strength/runs/bodyweight; browser check for the card.

### 5 + 6. Bodyweight goal corridor + export breadth

**Why now.** Both are small and close the data-ownership loop. The weight chart already exists (`profile-stats.js:59-212`); add goal line + weekly-rate corridor. Extend `csv-export.js` so bodyweight (and later measurements) leave the app with the training data. These can ship as one "body data completeness" PR or two tiny ones.

**Depends on:** #13 (measurements) for the measurement columns; bodyweight columns can ship immediately.

## NEXT — this quarter

### 7. Saved-workout editing (highest user value, do first in NEXT)

**Why.** A typo in a finished session is permanent today. openGym treats editing as a first-class History action (`openGym/frontend/src/lib/session-edit.js:1-18`). This is the most-requested class of data correction in any tracker.

**Shape.** Reuse the workout screen on a draft copy; save replaces one archived session and rebuilds derived stats/PRs from history. Start with **notes + set values**, then add date moves. Requires a careful `engine.js` recompute pass and tests proving a corrected session updates PR/e1RM but does not duplicate volume.

**Depends on:** nothing, but unlocks #8. **Risk:** highest in the backlog; split into two PRs (edit values, then move date).

### 8. Rotation + floating queue

**Why.** Fixed weekdays fail shift workers and missed days. openGym's A/B/C rotation and queue are prominent Plan features (`openGym/frontend/src/lib/rotation.js`; `openGym/frontend/src/lib/queue.js`).

**Shape.** New scheduling mode over existing program days; Home/Train choose "next session not done" or a floating week. **Depends on #7** for moving/pinning a session without corrupting history.

### 9. Progression breadth (Triple, Greyskull)

**Why.** Helyx has 3 program-level styles; openGym has 10 policies including per-exercise overrides (`openGym/frontend/src/lib/progression.js:29-68`). Triple progression and Greyskull cover many popular programs.

**Shape.** Clean-room rules in `suggestProgression`; expose in the existing Progression tab; add per-exercise policy only if the program lift shape can carry it (currently bare strings). **Depends on:** no schema change for program-level.

### 10. Per-side reps + timed holds

**Why.** Lunges, single-arm rows, planks and carries are common; "8 each side" vs "8 total" changes volume and progression.

**Shape.** Extend the set row model and every consumer (`set-entry`, `set-utils`, analytics, CSV). **Depends on:** a clear display contract first; do not mix it with editing.

### 11. Import breadth

**Why.** Switching cost is the main adoption barrier; openGym supports 10+ formats (`openGym/docs/DATA_IMPORTS.md:24-40`). Helyx supports three shapes.

**Shape.** Format detectors + clean-room parsers, synthetic fixtures, idempotent merge, existing-date-wins. Start with FitNotes and Liftosaur JSON; these cover a large share of Android/strength users.

### 12. Plan sharing + PDF

**Why.** Users want to hand a program to a coach/friend. Helyx already exports Markdown; a versioned JSON file + print CSS is a small extension. **Shape:** `program-export.js` JSON, importer validation, print stylesheet.

### 13. Body measurements

**Why.** Weight alone misses body recomposition; openGym has built-in + custom fields (`openGym/frontend/src/lib/measurements.js:5-52`). **Shape:** v8 state key, Progress subview, CSV import/export, backup include-list. Ship **before** photos.

### 14. Strength levels

**Why.** A motivational frame beyond raw PRs, cheap once e1RM exists (`openGym/frontend/src/lib/strength-level.js:1-12`). **Shape:** new pure standards table (public data, cited), Athlete Profile + exercise detail. No migration.

### 15. WebDAV backup

**Why.** Off-device backup is the strongest data-ownership feature still missing; Android folder backup dies with the device. openGym's WebDAV is device-to-server, no openGym server (`openGym/docs/WEBDAV_BACKUP.md:1-40`).

**Shape.** Opt-in backup target in `auto-backup.js`, credentials in Android secure storage, retention + restore/merge UI. **Depends on #6** (export format stable). **Risk:** first network dependency; keep it disabled by default and document the credential handling.

### 16. Per-set rest / pyramids / rest-pause

**Why.** Common intensity techniques; openGym supports per-set rest and pyramids (`openGym/README.md:73-79`). **Shape:** per-set rest field first (small), then pyramid/rest-pause metadata. **Depends on:** #10's set-model cleanup.

### 17. Searchable journal

**Why.** Session notes already exist but cannot be found. **Shape:** read `week.notes` into a Journal subview with search/filters; optionally standing exercise notes. No migration.

### 18. ICS calendar export

**Why.** Low effort, local-only alternative to openGym's server feed. **Shape:** pure ICS generator over the plan + archived weeks; share/download via `export-service.js`. No server, no token.

## LATER — backlog

- **19. Progress photos:** high privacy/storage cost; do after measurements and only with a clear export/delete story.
- **20–21. Challenges and Wrapped:** derive from existing history; schedule as a seasonal/motivation batch after the data model stabilises.
- **22. Structural balance:** niche; depends on strength levels/exercise metadata and enough e1RM history.
- **23. Android widget:** valuable but platform-only; after the core data model changes settle.
- **24. Gym geofence:** battery/privacy cost outweighs value for a training-first app.
- **25. Strava / GPX-FIT share-out:** prefer one-way file export over OAuth; revisit if run users ask.
- **26. Exercise catalogue text expansion:** source a public-domain/own catalogue; no media until licensed.
- **28. i18n/RTL:** large cross-cutting program; only after feature surface stabilises.

## DROP

- **27. Exercise animations:** legally blocked without a Gym visual licence; not a code problem. Revisit only with a signed media licence.
- **29. Tools screen:** Helyx already surfaces plate math and e1RM where they are used; a separate calculator screen adds navigation without new capability.
- **30. Seasonal themes/advent:** no product fit.
- **31. Gym check-in QR/barcode/NFC:** peripheral, adds camera/NFC permissions, and does not improve training data.
- **All server/multi-user features:** accounts, sync, API/tokens, trainers, community, admin, AI coach, MCP, push — **NOT APPLICABLE** to Helyx's local-first contract (see `03-gap-matrix.md`).

## Recommended sequencing

**Sprint A (NOW):** equipment inventory (v7) → warm-up ramp → muscle volume/recovery map → bodyweight corridor + export breadth.

**Sprint B:** saved-workout editing (values first, dates second) → rotation/queue.

**Sprint C:** progression breadth → per-side/timed → per-set rest → import breadth.

**Sprint D:** plan sharing → measurements (v8) → strength levels → WebDAV backup → journal → ICS.

**Seasonal/later:** photos, challenges/Wrapped, structural balance, widget, Strava, catalogue expansion, i18n.

**Migration budget:** v7 equipment inventory, v8 measurements, v9 (only if photos/trophies need persistence). Keep every migration reversible-on-read (unknown/future versions fail closed) and add fixtures before each bump.

**Dependency graph (short):**

```
equipment inventory ──> accurate plate/dumbbell hints
warm-up ramp ─────────> (independent)
muscle map ───────────> uses volume-guide + catalog muscles
export breadth ───────> WebDAV backup
saved-workout edit ───> rotation/queue, date moves
measurements ─────────> photos (later), richer CSV
e1RM (exists) ────────> strength levels ──> structural balance
history model ────────> challenges / Wrapped
```
