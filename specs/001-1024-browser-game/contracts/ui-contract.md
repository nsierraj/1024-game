# Contract: UI Structure and Accessibility

**Feature**: 001-1024-browser-game | **Date**: 2026-10-21 | **Plan**: [plan.md](../plan.md)

This contract fixes the DOM structure, the ARIA roles, and the CSS custom properties the game
relies on. It exists so three things cannot drift apart: the markup in `index.html`, the
rendering code in `src/ui/`, and the assertions in the test suite and the accessibility scan.

## Page structure

`index.html` is a single page. It contains the complete static shell; JavaScript fills in the
dynamic parts.

```html
<body>
  <header class="app-header">
    <h1 class="app-title">1024</h1>
    <div class="score-panel">
      <div class="score-box">
        <span class="score-label" id="score-label">Score</span>
        <span class="score-value" id="score">0</span>
      </div>
      <div class="score-box">
        <span class="score-label" id="best-score-label">Best</span>
        <span class="score-value" id="best-score">0</span>
      </div>
    </div>
  </header>

  <main class="app-main">
    <div class="board-wrap">
      <div id="board" class="board" role="grid" tabindex="0" aria-label="Game board, 4 by 4. Use the arrow keys to slide the tiles."></div>
      <div id="score-gain" class="score-gain" aria-hidden="true"></div>
    </div>

    <div class="controls">
      <button type="button" id="new-game" class="btn">New game</button>
      <button type="button" id="undo" class="btn">Undo</button>
      <button type="button" id="sound-toggle" class="btn" aria-pressed="false">Sound: off</button>
      <label class="theme-label" for="theme-select">Theme</label>
      <select id="theme-select" class="select">
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="contrast">High contrast</option>
        <option value="colorblind">Colour-blind safe</option>
      </select>
      <button type="button" id="help-toggle" class="btn" aria-expanded="false" aria-controls="help-panel">
        How to play
      </button>
    </div>

    <section id="help-panel" class="help-panel" hidden aria-labelledby="help-title">
      <h2 id="help-title">How to play</h2>
      <!-- goal, controls, and the iOS install steps -->
    </section>
  </main>

  <div id="status-region" class="visually-hidden" role="status" aria-live="polite"></div>

  <dialog id="win-dialog" class="dialog" role="dialog" aria-modal="true" aria-labelledby="win-title">…</dialog>
  <dialog id="gameover-dialog" class="dialog" role="dialog" aria-modal="true" aria-labelledby="gameover-title">…</dialog>
  <dialog id="confirm-dialog" class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">…</dialog>
</body>
```

> **Correction (2026-10-21)**: the page structure above labelled `#board` with `aria-labelledby`,
> pointing at the score label, and labelled `#help-panel` with the button that toggles it. The
> element contract and the focus management rules both require an `aria-label` on the board that
> states the controls, and a heading inside the help panel that focus can move to. The structure
> above now matches those rules. The `role="dialog"` and `aria-modal="true"` attributes are
> written out on the dialogs as the element contract requires, even though `dialog` already implies
> the role.

## Element contract

| Selector | Role / attribute | Contract |
|---|---|---|
| `#board` | `role="grid"` | Contains exactly 4 `role="row"` elements. Each row contains exactly 4 `role="gridcell"` elements, always, including empty cells (FR-052). |
| `#board` | `aria-label` | A human-readable name for the board, for example "Game board, 4 by 4". |
| `role="row"` | inside `#board` | Exactly 4 per board. |
| `role="gridcell"` | inside a row | Exactly 4 per row, 16 per board. Each cell's text content is the tile value, or the word "empty" (FR-050, FR-052). |
| `#score` | text | The current score, always visible during play (FR-015). |
| `#best-score` | text | The best score, always visible during play (FR-016). |
| `#score-gain` | `aria-hidden="true"` | The brief points-earned indicator (FR-018). Hidden from assistive technology because the live region already announces the change. |
| `#status-region` | `role="status"`, `aria-live="polite"` | Announces score changes, the win message, and the game-over message (FR-051). |
| `#undo` | `disabled` | Disabled when there is no snapshot (FR-027). |
| `#sound-toggle` | `aria-pressed` | `"false"` when sound is off, `"true"` when on. The visible label states the current state as well, so the state is never conveyed by the attribute alone (FR-039, FR-050). |
| `#theme-select` | `label[for]` | A labelled `<select>` with the five theme values (FR-041, FR-044). |
| `#help-toggle` | `aria-expanded`, `aria-controls` | Toggles `#help-panel` (FR-046). |
| `#help-panel` | `hidden` | Shown and hidden with the `hidden` attribute. |
| `#win-dialog` | `role="dialog"`, `aria-modal="true"` | Two choices only: keep playing and start a new game (FR-020). |
| `#gameover-dialog` | `role="dialog"`, `aria-modal="true"` | Final score and a way to try again (FR-023). |
| `#confirm-dialog` | `role="dialog"`, `aria-modal="true"` | Confirms starting a new game while one is in progress (FR-030). |
| `#cross-tab-notice` | `role="status"` | The notice shown when another tab saved the same game (FR-034). |

## Grid semantics

The board uses native grid semantics rather than a table or a canvas (D-08).

- `#board` is `role="grid"`. Each row is `role="row"`. Each cell is `role="gridcell"`.
- Every cell always exists, whether it holds a tile or not. Empty cells read "empty", so a
  screen reader user can perceive the board's shape rather than hearing a hole (FR-052).
- Tile values are always rendered as text, never as colour alone, and never as an image of a
  digit (FR-050).
- The board is not a single composite widget, so no `aria-activedescendant` indirection is
  needed. Focus stays on the board container or on a control.

## Focus management

| Event | Focus behaviour |
|---|---|
| A dialog opens | Focus moves to the dialog's first focusable control. The element focused before the dialog opened is remembered. |
| A dialog closes | Focus returns to the element that was focused before the dialog opened. |
| A dialog is open | Tab and Shift+Tab cycle only inside the dialog. Focus cannot leave it. |
| Escape | Closes the current dialog. On the confirmation dialog, Escape means "cancel", so the in-progress game continues. |
| `#help-toggle` is activated | Focus moves to the help panel's heading so the content is read out, then returns to the button when the panel is closed. |
| The board receives a key | The board container has `tabindex="0"` and an `aria-label` that states the controls, so a keyboard user knows the arrows work (FR-047). |

Focus is always visibly indicated. The focus indicator is never removed, only restyled
(FR-048).

## Themes

Themes are CSS custom properties on the root element. The root carries `data-theme` when the
player has made an explicit choice, and carries no attribute when the choice is `"system"`
(D-16). With no attribute, the stylesheet follows `prefers-color-scheme`, so the game reacts
to the operating system changing while it is open.

```css
:root {
  --bg: #faf8ef;
  --surface: #eee4da;
  --text: #5c534a;
  --text-strong: #403a33;
  --accent: #6b5a4a;
  --border: #8c8278;
  --focus-ring: #3b6ea5;
  --tile-2-bg: #eee4da;    --tile-2-fg: #4a4239;
  --tile-4-bg: #e6d7ba;    --tile-4-fg: #4a4239;
  --tile-8-bg: #d9b98d;    --tile-8-fg: #40382f;
  --tile-16-bg: #c2915c;   --tile-16-fg: #2b2015;
  --tile-32-bg: #9c6c3c;   --tile-32-fg: #ffffff;
  --tile-64-bg: #8f6234;   --tile-64-fg: #ffffff;
  --tile-128-bg: #74502c;  --tile-128-fg: #ffffff;
  --tile-256-bg: #5f4225;  --tile-256-fg: #ffffff;
  --tile-512-bg: #4c3620;  --tile-512-fg: #ffffff;
  --tile-1024-bg: #3a2a1a; --tile-1024-fg: #ffffff;
  --tile-high-bg: #2b2015; --tile-high-fg: #ffffff;
}
```

> **Correction (2026-10-21)**: the example palette this block replaces failed rule 1 below in four
> places. Tile 2 was 3.98:1, tile 4 was 3.83:1, tile 8 was 1.85:1, and tile 16 was 2.24:1. The
> values above are the corrected light palette: every tile value and every text colour reaches at
> least 4.5:1 against its background, and the focus ring and the control border reach at least
> 3:1. The tile ladder darkens sooner than the original so that the light text on the mid and high
> tiles stays readable.

| Theme | `data-theme` | Notes |
|---|---|---|
| System | *(absent)* | Follows `prefers-color-scheme`. |
| Light | `light` | The default palette. |
| Dark | `dark` | Dark surfaces, light tile text. |
| High contrast | `contrast` | Maximum separation. Must reach the 7:1 body-text ratio (FR-045, SC-016). |
| Colour-blind safe | `colorblind` | A blue-orange palette that stays distinguishable under the common red-green deficiencies. |

Rules that hold for every theme (FR-045, SC-016):

1. Body text and tile values reach at least a 4.5:1 contrast ratio against their background.
2. Non-text indicators, including the focus ring and the control borders, reach at least 3:1.
3. Every tile value remains legible at every value, including values above 1024 (FR-024). Values
   above 1024 share a distinct `--tile-high` pair.
4. The high-contrast theme reaches at least 7:1 for body text.

The contrast check for all four shipped themes is a release gate; see
[quickstart.md](../quickstart.md).

## Animations

- Tiles animate when they slide, when they merge, and when they appear (FR-035).
- The slide and merge animation completes within 150 milliseconds (FR-036, SC-009).
- Under `prefers-reduced-motion: reduce`, sliding, merging, and appearance animations are
  suppressed and replaced with an instant state change (FR-037). This is a stylesheet-level
  override, not conditional logic in the animation code.

```css
@media (prefers-reduced-motion: reduce) {
  .tile { transition: none !important; animation: none !important; }
}
```

## Input contract

| Input | Behaviour | Requirement |
|---|---|---|
| Arrow keys | Slide in the matching direction. | FR-010 |
| Pointer swipe | Slide in the dominant direction of the gesture. | FR-011 |
| Swipe below the threshold | Ignored. | FR-012, SC-014 |
| Swipe of exactly the threshold | Counts as a move. | FR-012 |
| Swipe over the threshold | The dominant axis wins. | FR-011 |
| Swipe on the board | Does not scroll, zoom, or trigger a browser gesture. | FR-013, FR-032 |

- The threshold is one quarter of the board's width for a horizontal gesture and one quarter of
  its height for a vertical gesture. A gesture travelling exactly one quarter counts as a swipe
  (D-07).
- The board carries `touch-action: none` so the browser does not claim the gesture (D-06).
- Input received while an animation is still running is queued and applied in order, so no move
  is lost (FR-064).

## Responsive contract

- The layout is usable from a 320 pixel viewport up to a large desktop (FR-065, SC-007).
- The board scales to fit the available space and stays square in both orientations (FR-066).
- The game remains fully usable at 200% text enlargement, with no loss of content or function
  (FR-054).
- Interactive controls are at least 24 by 24 CSS pixels (FR-053).
- Nothing scrolls sideways (FR-032).

## The `#status-region` announcement policy

| Event | Announcement | Requirement |
|---|---|---|
| A merge awards points | "Merged 16. Score 40." | FR-051 |
| The 1024 tile is created | "You reached 1024. Keep playing or start a new game." | FR-051 |
| The game ends | "Game over. Final score 120. Start a new game to try again." | FR-051 |
| Another tab saved the game | "This game was updated in another tab. The most recent save is shown." | FR-034 |

Score announcements are throttled so that a fast sequence of merges does not flood the region
(D-09). The win and game-over announcements are not throttled.
