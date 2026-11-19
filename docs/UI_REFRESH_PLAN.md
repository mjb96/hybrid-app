# UI refresh plan — openHybrid

**Status:** in progress — Midnight palette and Home/Progress card customization shipped; Settings sub-pages and the remaining screen batches are next.
**Goal:** make openHybrid feel like one coherent, modern training app — closer to openGym’s calm, card-based design language — without copying its AGPL code, changing the vanilla-JS stack, or risking training data.

## Design direction

openGym’s UI works because it is consistent, not because it is fancy:

- one card vocabulary (surface, radius, border, spacing);
- clear page hierarchy (title → primary action → content → secondary detail);
- bottom sheets for focused input, not full-page forms;
- one icon set and one button system;
- themes and accents treated as tokens, not per-screen overrides;
- modules remove whole surfaces without leaving holes;
- data-dense screens stay calm through spacing and type scale.

We will rebuild those **patterns** with our own HTML/CSS/JS. No openGym CSS, JSX or assets are copied; its code is AGPL and its exercise media is separately licensed.

## Problems in the current UI

- Two visual systems coexist: older inline/card styles and the newer Home/Progress surfaces.
- Colours, radii, spacing and control heights are often defined per screen.
- Settings is one long scroll with no search or sub-pages.
- Home and Progress show a fixed set of cards; users cannot choose what matters to them.
- Themes are dark/light/system only; no palette or accent choice.
- Some screens use emoji, others inline SVG icons.
- The Hybrid Score adds a prominent, opaque number that competes with readiness/load.

## Target model

### 1. Design tokens

Introduce one token layer and migrate screens to it:

| Group | Tokens |
|---|---|
| Surface | `--bg`, `--bg-card`, `--bg-raised`, `--overlay` |
| Text | `--text-primary`, `--text-secondary`, `--text-muted` |
| Border | `--border-subtle`, `--border-default`, `--border-strong` |
| Accent | `--accent`, `--accent-ink`, `--accent-soft` |
| Status | `--ok`, `--warn`, `--danger`, `--info` |
| Spacing | `--space-1` … `--space-8` (4 px base) |
| Radius | `--radius-sm/md/lg/xl` |
| Type | `--font-ui`, `--fs-caption` … `--fs-display`, line-height tokens |
| Elevation | `--shadow-card`, `--shadow-sheet` |
| Motion | `--motion-fast/base`, reduced-motion fallback |

Rule: screens may compose tokens but not invent raw colours, radii or shadows. A browser check will scan for obvious hard-coded hex values in new component CSS, with a documented allowlist for data visualisation.

### 2. Themes and accents

Add a real Appearance page:

```
settings.theme    'dark' | 'light' | 'system'
settings.palette  'midnight' | 'slate' | 'forest' | 'ember' | 'paper'
settings.accent   'cyan' | 'lime' | 'amber' | 'violet' | 'rose'
```

- Palettes change surfaces + status hues; accents change primary actions and data highlights.
- Preview swatches in the picker; apply live; persist; update `theme-color` and Android status/navigation bars.
- Keep the current dark theme as **Midnight**, the default, so existing users see no change until they choose.
- Contrast checks for every palette/accent pair at AA for body text and 3:1 for large text/UI.
- The service worker must version theme CSS so an installed PWA cannot keep an old palette.

### 3. Component system

Consolidate into documented primitives:

- `PageHeader` — back/close, eyebrow, title, one primary action.
- `Card` — optional header, body, footer; no per-screen radius.
- `Button` — primary/secondary/ghost/danger; 44 px minimum.
- `Field` — label, input, unit, error text.
- `Sheet` — shared open/close, drag handle, focus trap, safe-area padding.
- `EmptyState`, `Toast`, `Chip`, `Segmented`, `StatRow`.
- One inline SVG icon set; remove emoji from chrome (keep emoji only in user-authored notes).

Migrate Settings first because it is self-contained and immediately exposes every control.

### 4. Customizable data display

Add a **Customize** action to Home and Progress.

```
settings.ui = {
  home:     { order: ['today','weekStrip','insight','bodyweight','fasting','running','inFocus'], hidden: [] },
  progress: { order: ['strength','running','body','recovery','muscleLoad','load'], hidden: [] },
  density:  'comfortable' | 'compact'
}
```

Rules:

- Pinned and never hideable: safety flags, the primary Today/Start action, navigation, data-loss warnings.
- Modules still remove a surface globally; card visibility is a second, personal layer.
- Reset to default; changes persist and export/import with state.
- A live preview sheet shows the order; no drag required (Up/Down + switches are enough on mobile).
- Analytics deep links still work when a card is hidden; hiding is presentation, not access control.

### 5. Screen migration batches

Each batch ships with screenshots, a browser check and no data-model change:

1. **Settings** — sub-pages (Account, Training, Appearance, Data, Health, Modules), search, theme picker.
2. **Home** — card hierarchy, customizable sections, no score card.
3. **Progress** — hub, Body, Muscle Load, Strength/Running details, consistent charts.
4. **Train / cockpit** — set rows, rest bar, exercise cards, sheets; keep the fast logging contract.
5. **Plans** — catalogue cards, program detail, programme editor, builder.
6. **Onboarding** — one question per screen, progress, skip/restore.
7. **Workout logger details** — finish review, recap, share cards, empty states.

The **saved-workout editor** should land before the cockpit visual batch so the new sheet/card system is designed around it once, not twice.

### 6. Hybrid Score — recommendation

**Remove it from the primary product surfaces.**

Why:

- It is a bespoke composite with opaque weighting; users cannot tell what changed it.
- It is not part of openGym’s model, and it competes with readiness, ACWR and PRs.
- It appears on Home, Progress, sharing and notifications, increasing cognitive load.
- Training decisions are better served by the existing readiness, load and PR surfaces.

Plan:

1. Hide the Home/Progress cards and the share entry; keep the computation behind `settings.showHybridScore = false` for one release.
2. Replace the Home card with readiness/load (already computed).
3. Confirm no export/notification/deep-link dependency.
4. Delete `js/brain/hybrid-score/` and its tests in a cleanup PR if nothing depends on it.

If a single number is still wanted later, define it publicly as a transparent “Training Score” with visible components — not a black box.

## Sequencing

| Phase | Work | Risk |
|---|---|---|
| 0 | Baseline screenshots + token/colour audit; no visual change | Low |
| 1 | Tokens, palettes, accent picker, Settings page restyle | Medium — CSS breadth |
| 2 | Shared components + Settings sub-pages/search | Medium |
| 3 | Home/Progress customization + Hybrid Score removal | Medium — persistence/UX |
| 4 | Home and Progress visual migration | Medium |
| 5 | Train/cockpit + Plans + onboarding batches | High — high-traffic screens |
| 6 | Accessibility, contrast, performance, screenshot checks | Low |

Each phase is one PR (or two if a batch is large). No phase changes the storage schema except `settings.ui` / `settings.appearance`, seeded by a migration.

## Verification

- Existing 36 browser checks stay green; add one per migrated surface.
- Theme matrix: dark/light/system × every palette × 3 accents at 320/390/412 px.
- AA contrast for text and 3:1 for UI; 44 px targets; 200% text; safe areas.
- Performance baseline unchanged (first paint < 3000 ms, bounded DOM).
- Offline: themes and customization work from cache after an update.
- Screenshot review in the PR description for every migrated screen.

## Non-goals / risks

- No React or framework migration; this is a visual-system migration.
- No copying of openGym CSS, JSX, icons or media (AGPL / Gym visual).
- No change to training data, imports, exports or the Android bridges in UI-only phases.
- The biggest risk is half-migrated screens; batches must land with their checks, not behind a long-lived flag.
