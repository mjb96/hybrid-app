# Exercise catalogue

openHybrid has two catalogue layers:

| Layer | Source | Licence | Media |
|---|---|---|---|
| **Core** (`CORE_EXERCISES`) | Original openHybrid text | AGPL-3.0-only | None |
| **Extended** (`OPENGYM_EXERCISES`) | openGym-authored text | AGPL-3.0 | None |

## What is imported

`scripts/import-opengym-catalogue.mjs` reads a local openGym checkout and imports only entries that:

- have `textSource: "opengym"`;
- have a non-empty name and at least one instruction;
- map to a real openHybrid muscle/equipment/movement value.

It **excludes**:

- entries with `textSource: "exercisedb"` or no `textSource` (different dataset provenance);
- entries with no instructions;
- **all media** — openGym’s stills and animations are licensed to Gym visual and are not AGPL. Nothing under `catalogue/media/` is read or copied.

The generated file is `js/exercises/opengym-catalogue.js`; do not edit it by hand.

## Regenerate

```bash
# From a local openGym checkout:
node scripts/import-opengym-catalogue.mjs \
  --source /path/to/openGym/catalogue/exercises

npm run precache:gen
npm test
```

The importer reports total entries read, imported count, core duplicates, import duplicates, missing/no-muscle rows, and the output size.

## Mapping rules

- **Name** — title-cased; parentheses become an em dash so variants keep distinct search keys
  (`Bridge (on Knees)` → `Bridge — On Knees`).
- **Equipment** — mapped to `EQUIPMENT` (e.g. `leverage machine` → `machine`, `ez barbell` → `ezBar`,
  `body weight` → `bodyweight`). Unknown equipment becomes `other`.
- **Muscles** — `target` becomes the primary muscle at `1`; `secondaryMuscles` become `0.25`.
  A missing target falls back to the openGym body part.
- **Movement/category** — keyword/body-part mapping into `MOVEMENT_PATTERNS` and
  `EXERCISE_CATEGORIES`. Mobility/stretching/yoga/rehab entries become `conditioning`/`mobility`
  and are not volume-eligible.
- **Review status** — imported entries get `difficulty: null` and `safetyNotes: []`.
  They must not pretend to be reviewed. The existing reviewed core remains the 157-entry layer.
- **Browse order** — with no search query, filtered browse shows the reviewed core first, then the
  imported text catalogue alphabetically. A muscle/equipment filter must not bury a common lift
  under thousands of alphabetically earlier stretches.

## Media

Media is deliberately out of scope until there is a licence-compatible source. The audit found:

- **Free Exercise DB** (`yuhonas/free-exercise-db`) — public-domain/Unlicense, 800+ exercises with two
  stills each. Not true animations; could be crossfaded.
- **Wikimedia Commons** — real demo videos under CC licences, but sparse and inconsistent; needs
  per-file attribution and manual review.
- **wger** — exercise data is Creative Commons per entry; app is AGPL.
- **openGym media** — must not be copied.

No media is bundled in the catalogue PR. Any future media addition needs a per-file licence record,
attribution in `NOTICE.md`, and an APK-size decision.

## Integrity tests

`tests/opengym_catalogue.test.js` checks breadth, IDs, names, categories, movements, equipment,
muscle credits, provenance IDs, the generated-file licence header, and the absence of media fields.
`tests/exercise_catalog.test.js` continues to guard core catalogue uniqueness, program resolution and
reviewed-metadata shape.
