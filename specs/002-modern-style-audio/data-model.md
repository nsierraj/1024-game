# Data Model: Modern Style, Smoother Motion, and Sound Fixes

**Feature**: 002-modern-style-audio | **Date**: 2026-10-22 | **Plan**: [plan.md](plan.md)

This feature adds no stored data and changes no stored record (R-10). The entities below are the
design-time and run-time shapes the new code works with. The game state, the stored game, the best-score
record, and the settings record are defined in feature 001 and are unchanged.

## 1. Theme (design tokens)

A theme is a set of named colour and shape tokens applied to the page root. Five values exist and are the
same strings as before: `system`, `light`, `dark`, `contrast`, `colorblind` (`system` means "follow the
device" and resolves to `light` or `dark`).

| Group | Tokens | Rules |
|---|---|---|
| Surfaces | `--bg`, `--surface`, `--board-bg` | Muted, slightly desaturated (FR-015). |
| Text | `--text`, `--text-strong` | At least 4.5:1 against `--bg` and `--surface` (FR-021). |
| Accent | `--accent`, `--accent-fg` | One accent. `--accent-fg` on `--accent` at least 4.5:1; `--accent` on `--bg` at least 4.5:1 for text use (FR-020). |
| Interface | `--border`, `--focus-ring` | At least 3:1 against `--bg` and `--surface` (FR-016, FR-021). |
| Tiles | `--tile-{2,4,8,16,32,64,128,256,512,1024,high}-bg` and `-fg` | 11 pairs. Each pair at least 4.5:1 (7:1 in `contrast`). `high` is used for every value above 1024 (FR-020, feature 001 FR-024). |
| Shape | `--radius-board`, `--radius-tile`, `--radius-control`, `--gap` | Not colour; shared by all themes. |
| Depth | `--shadow-tile`, `--shadow-raised`, `--tile-highlight` | Soft two-layer shadows and a 1 px inner highlight. |
| Type | `--font-ui`, `--font-size-*` | System fonts only (R-09). |

**State**: a theme is selected by `data-theme` on the root element, or by the device preference when none is
set. The choice persists in the settings record (unchanged).

**Hue ladder** (light and dark share it): hue by value 2 -> 1024 is 215, 200, 184, 166, 140, 92, 48, 28, 10,
345 degrees. Concrete values are in [contracts/theme-tokens.md](contracts/theme-tokens.md).

## 2. Sound effect (recipe)

A recipe is plain data, so it can be tested without a browser.

| Field | Type | Rules |
|---|---|---|
| `id` | `"move" \| "merge" \| "undo" \| "win" \| "gameover"` | Exactly these five. |
| `notes` | list of `{ at, frequency, endFrequency?, partials, decay }` | `at` in seconds from the start; `partials` is a list of `{ ratio, gain }`; `decay` is the envelope time constant in seconds. |
| `duration` | seconds | At least 0.08 and at most 1.2. |
| `peak` | number, dBFS | Always -9 (R-04). |
| `fadeIn`, `fadeOut` | seconds | 0.003 and 0.012, so the buffer never starts or ends on a click. |

**Rendering**: `renderEffect(recipe, sampleRate)` returns a `Float32Array` of mono samples, normalised so
the largest absolute sample equals `peak`.

**Validation rules**
- No two recipes render to the same samples (SC-005).
- Every rendered effect peaks between -12 and -3 dBFS and the five peaks differ by at most 3 dB (SC-006).
- The first and last samples are within 0.001 of zero (no click).
- The shipped set takes no bytes of audio data from the network (FR-013, SC-010).

## 3. Audio state

The state of the single audio context, which drives the sound control.

| State | Meaning | Control shows |
|---|---|---|
| `off` | Sound is disabled, or has never been enabled. Nothing has been created. | Off |
| `arming` | The player asked for sound; the context is being created and resumed inside the gesture. | Off until resolved |
| `on` | The context is `running` and the five buffers are rendered. | On |
| `suspended` | Sound is enabled in settings but the context is not running (blocked, interrupted, or closed by the OS). | Off |

**Transitions**
- `off` -> `arming`: the player activates the sound control (or a saved "on" is restored at startup).
- `arming` -> `on`: `resume()` resolved with `running` in the same gesture. The setting is saved as on.
- `arming` -> `off`: the player's own toggle could not start sound (`resume()` failed or the context is not
  running). The setting is saved as off. A reload restore that fails on the first gesture does not change the
  setting: the saved "on" is kept for the next gesture.
- `on` -> `suspended`: the context reports `suspended` or `interrupted`, or the page is hidden.
- `suspended` -> `on`: the next user gesture or `visibilitychange` resumes the context successfully.
- any -> `off`: the player turns sound off.

**Invariant**: the control shows "on" only in the `on` state (FR-014).

## 4. Motion

The timeline of one board change. Values are in milliseconds from the start of the move, and every end is
at most 150 (FR-005).

| Kind | Starts | Ends | Applies to |
|---|---|---|---|
| Slide | 0 | 100 | every moving tile |
| Merge emphasis | 60 | 150 | the tile a merge produced |
| Spawn entrance | 70 | 150 | the newly placed tile |
| Fade out | 0 | 80 | a tile removed by undo or new game |
| New-game cross-fade | 0 | 150 | the whole tile layer |
| Dialog enter | 0 | 160 | a dialog and its backdrop (not a board change) |
| Dialog leave | 0 | 120 | a dialog and its backdrop (not a board change) |

Under the reduced-motion preference every row becomes an instant change or a fade of at most 100 ms
(FR-007).
