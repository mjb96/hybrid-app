## Summary

<!-- What user job is easier or clearer? One paragraph, no file list. -->

## Phase and quality gate

- **Phase:** P0 data correctness / P1 History / P2 Progress / P3 Logger / P4 analysis
- **Gap-matrix rows this closes:**
- **Parity claim vs the bar** (above openGym, on par with Hevy):
  - Logging:
  - Programs:
  - UI/UX journey:
- **Reference evidence:** before/after interaction trace or screenshots for every
  changed surface. "It renders" is not evidence.

## Quality gate (all required before merge)

- [ ] The phase's known parity gaps are closed; no gap this PR was meant to close is left open.
- [ ] Common-path logging/flow has no extra taps vs the Hevy/openGym reference without a stated reason.
- [ ] Empty, error, loading, offline and sparse-data states covered where the surface can reach them.
- [ ] No hidden settings, duplicated surfaces, unreachable controls, or hard-coded units.
- [ ] Calendar/program attribution is correct: imported, archived and same-day sessions still count once, on their real date.
- [ ] Mobile checked at 320/390/412 px, light and dark, 44 px targets, no horizontal overflow.
- [ ] No history rewrite, no destructive action without undo, no new network/account/cloud surface.
- [ ] Tests and browser checks were added or strengthened — never weakened — to pass.
- [ ] Clean-room only: no copied Hevy/openGym code, assets, media or visual identity.

## Validation

Exact commands and results (copy the summary lines, not just "passed"):

- `npm test` —
- `npm run typecheck` —
- `npm run smoke` —
- `npm run browser:verify` — (or `npm run preflight` for shared UI)
- Android `Required verification` — (link or note it is pending)

## Data safety

- Stored-state changes / migration:
- Export/backup impact:
- Android mirror impact:

## Screenshots / traces

<!-- Before and after, or a numbered tap trace. Link the files or paste them. -->
