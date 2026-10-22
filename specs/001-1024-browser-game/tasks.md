---
description: "Task list for the 1024 browser game implementation"
---

# Tasks: 1024 Browser Game

**Input**: Design documents from `/specs/001-1024-browser-game/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. Constitution Principle III (NON-NEGOTIABLE) requires an automated unit test
for every rule in BRD sections 6.1 through 6.5, and SC-003 requires every rule in the
Functional Requirements section to be covered. Tests are therefore mandatory here, not optional.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and
delivered as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/`, `tests/` at repository root
- Paths shown below assume the single project layout in `plan.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create the directory structure from `plan.md`: `src/core/`, `src/ui/`, `src/services/`, `src/styles/`, `assets/icons/`, `assets/audio/`, `tests/unit/`, `tests/integration/`
- [x] T002 [P] Add a `serve` script to `package.json` that runs `node scripts/serve.mjs` on port 8080
- [x] T003 [P] Create `scripts/serve.mjs`, a zero-dependency static file server on `node:http` that serves the repository root with correct MIME types for `.html`, `.js`, `.css`, `.json`, `.webmanifest`, `.png`, and `.mp3`
- [x] T004 [P] Create `robots.txt` allowing all crawlers
- [x] T005 [P] Add `.gitignore` entries for `node_modules/`, `.DS_Store`, and `*.log`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Write `tests/unit/random.test.js` covering seed determinism, the `[0, 1)` output range, and uniformity over 10,000 samples; this test MUST fail until T009 lands, and it is the first test in the repository so the required `test` check stops passing vacuously
- [x] T007 Create `src/core/constants.js` with `BOARD_SIZE`, `CELL_COUNT`, `TARGET_VALUE`, `INITIAL_TILE_COUNT`, `SPAWN_VALUES`, and `SPAWN_WEIGHTS` exactly as specified in `contracts/logic-core-api.md`
- [x] T008 [P] Create `src/core/types.js` with the JSDoc typedefs `Direction`, `Board`, `SlideTransition`, `SlideResult`, `Game`, `UndoSnapshot`, and `MoveResult` from `contracts/logic-core-api.md`
- [x] T009 Implement `src/core/random.js` with `createRandom(seed)` using mulberry32 to satisfy T006, seeded from an unsigned 32-bit integer and returning values in `[0, 1)`
- [x] T010 [P] Create `src/ui/strings.js` holding every user-facing string from `contracts/ui-contract.md`, including the four live-region announcements, so no text is hard-coded anywhere else
- [x] T011 [P] Create `src/styles/base.css` with the page layout, the visible focus ring, the `.visually-hidden` utility, the minimum 24x24 px control sizing, and the default light palette as CSS custom properties on `:root`
- [x] T012 Create `index.html` with the semantic app shell from `contracts/ui-contract.md`: `role="grid"` board container, `role="status"` live region, labelled score panel, the controls row, the `#help-toggle` button with the goal and controls text in the help panel, and the three `role="dialog"` containers

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

> **Grouping**: T006 and T009 land in the same pull request. T006 is red on its own by design,
> and the required `test` check must be green for the pull request to merge. The test is still
> written first, which is what the requirement is about.

---

## Phase 3: User Story 1 - Play a full game to a win or a game over (Priority: P1) 🎯 MVP

**Goal**: A complete, playable 4x4 sliding game. Arrow keys move the tiles, matching tiles merge,
the score and best score update, and the game ends in a win or a game over with the final score.

**Independent Test**: Start a new game and play with the arrow keys until either a 1024 tile
appears or no legal move remains. The board, score, and win or game-over outcome are all correct
without any further story.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US1] Write `tests/unit/board.test.js` covering the slide rules in `contracts/logic-core-api.md`: tiles compact toward the edge in all four directions, equal neighbours merge, a tile merges at most once per move (FR-008), the pair closest to the destination edge merges first (FR-009), `gained` equals the sum of merged tile values, and `moved` is false when the board is unchanged
- [x] T014 [P] [US1] Write `tests/unit/game.test.js` covering the game rules: a new game starts with exactly two tiles (FR-002), a valid move places exactly one tile (FR-004), an invalid move changes nothing and places no tile (FR-005), the score increases by the merged value (FR-014), the best score updates on a new record and never decreases (FR-016, FR-017), the 90/10 spawn distribution holds over many samples (FR-003), the first 1024 tile raises the win (FR-019), and a full board with no equal neighbours ends the game (FR-022)
- [x] T015 [P] [US1] Write `tests/integration/game-flow.test.js` that plays a scripted game from a new game through merges to a game over, asserting the board, score, best score, and status at each step

### Implementation for User Story 1

- [x] T016 [US1] Implement `slide`, `hasAvailableMoves`, and `hasNoAdjacentEqual` in `src/core/board.js` to satisfy T013
- [x] T017 [US1] Implement `createGame`, `applyMove`, and `canUndo` in `src/core/game.js` to satisfy T014, injecting the random source rather than calling `Math.random`
- [x] T018 [US1] Implement the per-cell `transitions` list in the `slide` result in `src/core/board.js`, matching the ratified `SlideResult` and `SlideTransition` shapes in `contracts/logic-core-api.md`, so a tile that slides and merges in one move can be animated correctly
- [x] T019 [P] [US1] Create `src/ui/render.js` to draw the 4x4 board, the tiles, the score, and the best score from game state, reusing tile elements between renders so transitions stay continuous, and create `src/styles/board.css` with the board and tile styles and link it from `index.html`, since T040, T049, and T059 extend it
- [x] T020 [P] [US1] Create `src/ui/animations.js` for the slide, merge, and spawn animations, finishing within 150 ms (FR-036), and write `tests/unit/animations.test.js` covering the duration limit and the classes each group of tiles carries
- [x] T021 [US1] Create `src/ui/input.js` with arrow-key handling for the four directions (FR-010) and a queue that holds input arriving during an animation so no move is lost (FR-064), and write `tests/unit/input.test.js` covering the four keys and the queue, since the module takes its target and its blocker as arguments and can be driven without a browser
- [x] T022 [P] [US1] Create `src/ui/dialogs.js` with the win dialog offering exactly keep playing and new game (FR-020) and the game-over dialog presenting the final score and a way to try again (FR-023), and write `tests/unit/dialogs.test.js` covering the choices each dialog offers and what Escape means on each one
- [x] T023 [US1] Create `src/main.js` to bootstrap the game, wire the core, renderer, input, and dialogs, and start the first animation loop, and load it from `index.html` as a module script
- [x] T024 [US1] Add the new-game control to `index.html` and the confirmation dialog to `src/ui/dialogs.js` so starting a new game mid-game asks first and declining keeps the current game (FR-029, FR-030)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Undo my last move (Priority: P2)

**Goal**: The player can take back the single most recent valid move, restoring the board, the
current score, and the best score to their pre-move values.

**Independent Test**: Play several moves, undo once, and confirm the board, the current score, and
the best score all return to the values they had before the last move, and that a second undo is
not possible.

### Tests for User Story 2 ⚠️

- [x] T025 [P] [US2] Write the undo cases in `tests/unit/game.test.js`: undo restores board, score, and best score (FR-026), the best score never decreases across an undo (superseded by T073: undo lowers the best score), the snapshot is cleared so a second undo does nothing (FR-025), undo is unavailable at the start of a new game (FR-027), and undo works from the game-over state (FR-028)
- [x] T026 [P] [US2] Extend `tests/integration/game-flow.test.js` with the undo scenarios: undo after a merge, undo from game over, and a second undo that changes nothing

### Implementation for User Story 2

- [x] T027 [US2] Implement `undo` in `src/core/game.js` to satisfy T025: restore the snapshot, keep the best score monotonic, clear the snapshot afterwards, and recompute the status from the restored board (superseded by T074: the snapshot restores the best score, the win, and the status exactly)
- [x] T028 [P] [US2] Add the `#undo` button to the controls row in `index.html`
- [x] T029 [US2] Wire the `#undo` control in `src/main.js` to call `undo`, re-render the board, and set the button's `disabled` state from `canUndo` so it is unavailable at the start of a new game (FR-027)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Resume the game I left (Priority: P2)

**Goal**: The game is saved on the player's device after every move and restored exactly, including
the board, the current score, the best score, the win state, and undo availability.

**Independent Test**: Play a few moves, record the board and both scores, reload the game, reopen
it, and confirm the board, the current score, the best score, and the undo availability are
identical.

### Tests for User Story 3 ⚠️

- [x] T030 [P] [US3] Write `tests/unit/persist.test.js` covering `contracts/storage-schema.md`: the saved record shape, the version check, rejection of a malformed board or score, the settings defaults, and the requirement that a storage failure is non-fatal
- [x] T031 [P] [US3] Write `tests/integration/storage-flow.test.js` covering save, reload, resume, best-score continuity across games, and the cross-tab notice raised when another tab writes the game key

### Implementation for User Story 3

- [x] T032 [US3] Create `src/services/persist.js` to read, validate, and write the `1024:v1:game` and `1024:v1:settings` records, wrapping every access so a denied or evicted store degrades to a session-only game with no error shown
- [x] T033 [P] [US3] Create `src/services/settings.js` for the theme, sound, and visited flags with the documented defaults, so an unreadable settings record yields `theme: "system"`, `sound: false`, `visited: false`
- [x] T034 [US3] Save the game in `src/main.js` after every valid move, after an undo, and when a new game starts, and restore it on startup, starting a fresh game when the record is missing or malformed
- [x] T035 [US3] Carry the best score across games in `src/main.js` so the stored best survives a new game and a reload (FR-016)
- [x] T036 [US3] Add the cross-tab notice to `index.html` and listen for the `storage` event in `src/main.js`, comparing the event key against `1024:v1:game` so a settings change in another tab does not raise it (FR-034)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Keep playing after 1024 (Priority: P3)

**Goal**: After the 1024 tile is created, the player can continue playing for a higher score with no
second win message, and tiles above 1024 stay readable.

**Independent Test**: Reach a 1024 tile, choose to keep playing, and confirm play continues with no
further win message and that tiles above 1024 remain distinguishable.

### Tests for User Story 4 ⚠️

- [x] T037 [P] [US4] Write the endless-mode cases in `tests/unit/game.test.js`: choosing keep playing leaves `hasWon` true and `endless` true, no further win is raised (FR-021), and a later game over still ends the game normally without a second win message

### Implementation for User Story 4

- [x] T038 [US4] Implement the endless transition in `src/core/game.js` so that after `endless` is set the status returns to `active` while `hasWon` stays true
- [x] T039 [US4] Update the win dialog in `src/ui/dialogs.js` to offer exactly two choices and to suppress the win dialog for every subsequent 1024 tile
- [x] T040 [P] [US4] Style tiles above 1024 distinctly in `src/styles/board.css` using the `--tile-high-bg` and `--tile-high-fg` tokens so they remain readable and distinguishable (FR-024)

**Checkpoint**: User Stories 1 through 4 should all work independently

---

## Phase 7: User Story 5 - Play on my phone, with or without a signal (Priority: P3)

**Goal**: The game responds to swipes, keeps a square board on a narrow screen, installs to a home
screen, and plays a full game with no network.

**Independent Test**: Play a full game using only swipes on a phone, then install the game, switch
the device to airplane mode, and confirm a full game can still be played.

### Tests for User Story 5 ⚠️

- [x] T041 [P] [US5] Write `tests/unit/swipe.test.js` covering `resolveSwipe`: a swipe under one quarter of the board's width, for a horizontal gesture, or under one quarter of its height, for a vertical gesture, is ignored (FR-012), a swipe of exactly one quarter counts as a move (FR-012), a swipe over the threshold moves in the dominant axis (FR-011), and a diagonal swipe resolves to the axis with the greater absolute travel (FR-011)
- [x] T042 [P] [US5] Write `tests/unit/precache.test.js` that reads the `PRECACHE_ASSETS` list out of `sw.js` and asserts every listed path exists on disk, so a missing precached asset fails the build rather than the deploy

### Implementation for User Story 5

- [x] T043 [US5] Create `src/ui/swipe.js` with the pure gesture resolution: a `SWIPE_FRACTION` of one quarter of the board's width or height, and a `resolveSwipe(dx, dy, width, height)` returning a direction or null
- [x] T044 [US5] Implement pointer handling in `src/ui/input.js` with `pointerdown`, `pointermove`, and `pointerup`, using `setPointerCapture` and `touch-action: none` so the page never scrolls, zooms, or navigates (FR-013, FR-032)
- [x] T045 [US5] Create `manifest.webmanifest` with the name, short name, `display: "standalone"`, `start_url`, theme and background colours, and the 192, 512, and maskable icons (FR-060), and link it from `index.html` so the browser can offer the game for installation
- [x] T046 [US5] Create `sw.js` with the precache list, the network-first navigation strategy, the cache-first asset strategy, the cache cleanup on activate, and the rule that the worker MUST NOT call `skipWaiting()` on its own (FR-059, FR-061)
- [x] T047 [US5] Create `src/services/sw-register.js` and register the service worker from `src/main.js`
- [x] T048 [P] [US5] Generate the PNG icons at 192, 512, and a maskable 512 in `assets/icons/`, and add the `apple-touch-icon` link to `index.html`
- [x] T049 [US5] Add the responsive square board rules and the 320 px viewport floor to `src/styles/board.css` so the board scales and stays square in both orientations (FR-065, FR-066)
- [x] T050 [US5] Add the iOS install steps to the help panel text in `src/ui/strings.js`, since iOS has no programmatic install prompt

**Checkpoint**: User Stories 1 through 5 should all work independently

---

## Phase 8: User Story 6 - Set the game up the way I like it (Priority: P4)

**Goal**: Five themes including high-contrast and colour-blind-safe, sound off by default and
loaded only when first enabled, and reduced-motion honoured.

**Independent Test**: Switch themes and toggle sound, reload the game, and confirm both choices
persist, that the first visit follows the device's own light or dark setting, and that the manual
choice wins from then on.

### Tests for User Story 6 ⚠️

- [x] T051 [P] [US6] Write `tests/unit/settings.test.js` covering the settings defaults, theme validation with an unknown value falling back to `system`, and the `visited` flag
- [x] T052 [P] [US6] Write `tests/unit/audio.test.js` covering the lazy-load gate: no audio file is fetched until the player first enables sound, the toggle reports on only after the files are ready, and a failed fetch leaves the sound off

### Implementation for User Story 6

- [x] T053 [US6] Create `src/styles/themes.css` with the four explicit themes and the `prefers-color-scheme` default applied when no `data-theme` attribute is present (FR-041, FR-042, FR-044)
- [x] T054 [US6] Create `src/ui/themes.js` to apply the theme to the root element, follow the system preference until the player overrides it, and re-follow it live when the system setting changes (FR-043)
- [x] T055 [US6] Create `src/services/audio.js` to fetch and decode the four effects on the first enable and play them, capping the gain so a burst of merges cannot be startling (FR-038, FR-040)
- [x] T056 [P] [US6] Generate the four mono MP3 effects as `assets/audio/move.mp3`, `assets/audio/merge.mp3`, `assets/audio/win.mp3`, and `assets/audio/gameover.mp3`, totalling under 100 KB
- [x] T057 [US6] Add the theme selector and the sound toggle to `index.html` and wire both in `src/main.js`, with the sound toggle carrying `aria-pressed` and a visible label stating the current state
- [x] T058 [US6] Persist the theme and sound choices through `src/services/settings.js` and restore them on startup (FR-033)
- [x] T059 [US6] Honour `prefers-reduced-motion` in `src/styles/board.css` and `src/ui/animations.js` so sliding, merging, and spawning are suppressed and replaced with an instant state change (FR-037)

**Checkpoint**: User Stories 1 through 6 should all work independently

---

## Phase 9: User Story 7 - Play with a screen reader or without a mouse (Priority: P4)

**Goal**: The full game is operable with the keyboard alone and every tile value, score change,
win, and game over is perceivable to a screen reader.

**Independent Test**: Complete a full game using only the keyboard, with a screen reader running,
and confirm every tile value, score change, win, and game over is perceivable.

### Tests for User Story 7 ⚠️

- [x] T060 [P] [US7] Write `tests/unit/a11y.test.js` covering the announcement strings in `src/ui/strings.js` and the board cell text, where an occupied cell reads its value and an empty cell reads "empty" (FR-050, FR-052), and check that `index.html` and `STRINGS` do not drift, since the shell carries the same words as the static copy of the interface

### Implementation for User Story 7

- [x] T061 [US7] Create `src/ui/a11y.js` with the polite live region, the throttled score announcements, and the win and game-over announcements (FR-051)
- [x] T062 [US7] Render all 16 grid cells in `src/ui/render.js` with `role="row"` and `role="gridcell"`, each reading its tile value or the word "empty" (FR-052)
- [x] T063 [US7] Implement focus trapping and focus restoration in `src/ui/dialogs.js`, so focus moves into a dialog on open and returns to the opening control on close (FR-048)
- [x] T064 [US7] Ensure every control in `index.html` is reachable and operable by keyboard and that the focus indicator is never removed, only restyled, in `src/styles/base.css` (FR-047, FR-048)
- [ ] T065 [US7] Run the manual keyboard and screen-reader pass from `quickstart.md` and record the result in `specs/001-1024-browser-game/verification.md` (FR-055, SC-004)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T066 [P] Verify the asset budgets from `quickstart.md`: under 300 KB for all assets except sound, under 100 KB for the sound, and under 400 KB combined (FR-058, SC-008, SC-015)
- [x] T067 [P] Verify the contrast ratios of all four shipped themes, with the high-contrast theme reaching 7:1 for body text, and record them in `specs/001-1024-browser-game/verification.md` (FR-045, SC-016)
- [x] T068 Create `specs/001-1024-browser-game/verification.md` as the running log of the release gate results from `quickstart.md`
- [x] T069 [P] Update `README.md` with how to run the game locally and how to run the test suite
- [x] T070 Confirm `package.json` still declares no `dependencies` and no `devDependencies`, preserving Principle I
- [ ] T071 Run the full `quickstart.md` validation end to end, including the manual browser matrix check and the offline airplane-mode check (SC-011, SC-006)
- [x] T072 Merge the feature branch into `main` through a pull request whose `spec-integrity` and `test` checks pass in `.github/workflows/ci.yml`, as constitution v1.1.0 requires

## Phase 11: Analysis Remediation (2026-10-22 clarifications)

**Purpose**: Bring the code, tests, and contracts in line with the five clarifications recorded in
`spec.md` on 2026-10-22 and with the findings of the `/speckit-analyze` run that followed. Tests
come first for every rule change (Constitution Principle III).

- [x] T073 Rewrite the undo expectations in `tests/unit/game.test.js` and `tests/integration/game-flow.test.js` so undo lowers the best score back to its pre-move value (FR-026) and rewinds `hasWon`, `endless`, and `status` when the undone move created the first 1024 tile (FR-019); watch them fail
- [x] T074 Change `applyMove` and `undo` in `src/core/game.js` so the undo snapshot carries `hasWon`, `endless`, and `status`, and undo restores all of them and the best score exactly; update the undo section of `contracts/logic-core-api.md` and `data-model.md`
- [x] T075 Fix `src/main.js` so undoing from game over re-arms the game-over dialog (reset `gameOverShown` and `winShown`), and add an Undo button to the game-over dialog in `index.html` and `src/ui/dialogs.js` so FR-028 is reachable without an Escape key
- [x] T076 Write the storage tests first in `tests/unit/persist.test.js` and `tests/integration/storage-flow.test.js`: a v1 record is converted and resumed, a corrupt or unknown record starts fresh, and a readable best score and the settings survive both (FR-061)
- [x] T077 Implement stored-game version 2 in `src/services/persist.js`: key `1024:v2:game`, the extended undo snapshot, a conversion from the `1024:v1:game` record, and a separate `1024:v2:best` record so a corrupt game record cannot take the best score with it; update `contracts/storage-schema.md` and the key constants used by `src/main.js`
- [x] T078 Wire the announcer: make `createAnnouncer` in `src/ui/a11y.js` take its element, read all text from `STRINGS`, drop the module-level state, and call it from `src/main.js` on a merge, a win, and a game over (FR-051); write `tests/unit/a11y.test.js` cases that drive it without a browser; correct T063 (the dialogs are native modal `<dialog>` elements, so the browser contains and restores focus) and remove the unused `trapFocus`
- [x] T079 Remove the four mp3 files from `PRECACHE_ASSETS` in `sw.js`, bump `CACHE_NAME`, restore sound on a reload with sound saved on, and update `tests/unit/precache.test.js` and `contracts/offline-contract.md` (FR-040, SC-015)
- [x] T080 Add a strict Content-Security-Policy `<meta>` to `index.html` allowing only same-origin resources (Constitution Principle V, FR-062), and extend `tests/unit/styles.test.js` or add a test that fails if `index.html` gains an inline script, inline event handler, or external origin
- [x] T081 Update `README.md`, `verification.md`, and the checklist notes after T073 to T080, leaving the manual gates (T065, T071) unrecorded until a person has run them
- [x] T082 Remove `maximum-scale=1, user-scalable=no` from the viewport tag in `index.html`, which stops the player zooming the page and fails WCAG 1.4.4 (FR-054, FR-055); a swipe on the board is already kept from zooming by `touch-action: none` in `src/styles/board.css` (FR-013); add the zoom tests to `tests/unit/a11y.test.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Needs the game core from US1, but must be independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Needs the game core from US1, but must be independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Needs the win state from US1, but must be independently testable
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Independent of the other stories
- **User Story 6 (P4)**: Can start after Foundational (Phase 2) - Independent of the other stories
- **User Story 7 (P4)**: Can start after Foundational (Phase 2) - Independent of the other stories, but its manual pass should follow US6 so every theme is present

### Within Each User Story

- Tests MUST be written and MUST FAIL before the implementation that satisfies them
- Core logic before rendering, rendering before input wiring
- Service implementation before the control that uses it
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Within US1, the renderer, the animation module, and the dialog module marked [P] touch different
  files and can be built in parallel
- US5, US6, and US7 touch largely different files and can be worked in parallel by different people

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write tests/unit/board.test.js covering the slide rules in contracts/logic-core-api.md"
Task: "Write tests/unit/game.test.js covering the game rules"
Task: "Write tests/integration/game-flow.test.js that plays a scripted game"

# Launch the presentation modules together:
Task: "Create src/ui/render.js to draw the board, tiles, score, and best score"
Task: "Create src/ui/animations.js for the slide, merge, and spawn animations"
Task: "Create src/ui/dialogs.js with the win dialog and the game-over dialog"
```

---

## Parallel Example: User Stories 5, 6, and 7

```bash
# Different stories, different files, no shared dependencies:
Task: "Create src/ui/swipe.js with the pure gesture resolution"          # US5
Task: "Create src/styles/themes.css with the four explicit themes"       # US6
Task: "Create src/ui/a11y.js with the polite live region"                # US7
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Add User Story 6 → Test independently → Deploy/Demo
8. Add User Story 7 → Test independently → Deploy/Demo
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 5
   - Developer C: User Story 6
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- A test task and the implementation that satisfies it land in the same pull request. The test is
  written first, but the required `test` check has to be green for the pull request to merge
- `scripts/run-tests.mjs` fails the check when the suite collects zero tests and any file exists
  under `src/`, so the required `test` gate cannot pass vacuously once implementation begins
- Commit after each task or logical group; each commit reaches `main` only through a pull request
  whose `spec-integrity` and `test` checks pass, per constitution v1.1.0
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- The MVP is a development increment, not a release. Constitution Principle IV and the release
  gates mean nothing ships until User Story 7 and the `quickstart.md` validation have passed
- Two task descriptions were widened while implementing, because the list as written left a gap:
  T019 now also creates `src/styles/board.css` and links it from `index.html`, since T040, T049,
  and T059 extend a stylesheet nothing created, and T045 now also links `manifest.webmanifest`
  from `index.html`, since an unlinked manifest is never offered for installation
- T023 now also loads `src/main.js` from `index.html` as a module script, so the shell carries no
  reference to a file that does not exist yet
- 2026-10-21, User Story 1. Three task descriptions were widened, because the list as written left
  the interface layer of this story without a test: T020 now also writes
  `tests/unit/animations.test.js`, T021 now also writes `tests/unit/input.test.js`, and T022 now
  also writes `tests/unit/dialogs.test.js`. The three modules take their elements and their
  collaborators as arguments, so each can be driven from Node without a browser and without
  adding a dependency. The suite is 115 tests.
- 2026-10-21, User Story 1. The board in the page is a native grid of sixteen cells that carries
  the meaning, and the tiles are drawn in a separate layer over it that is hidden from assistive
  technology, because a tile that slides has to travel smoothly from one cell to the next and a
  grid cell cannot do that on its own. T062 therefore finds its renderer half already in place
  from T019 and is left with the test of the cell text.
- 2026-10-21, User Story 1. `src/styles/board.css` already carries the `prefers-reduced-motion`
  override, because the animation it governs ships in this story. T059 keeps the JavaScript side
  and the test.
- 2026-10-21, User Story 1. Escape closes whichever dialog is open, as the UI contract says. On
  the win dialog a dismissal is a win that carries on rather than one that is raised again, so the
  game never sits in a state with no way forward. On the confirmation dialog Escape means
  "cancel", so the game in progress continues. Both are recorded in `contracts/ui-contract.md`.
- 2026-10-21, User Story 1. The announcements to the live region are T061's, so `#status-region`
  stays empty in this story. The win and game-over messages are native modal dialogs, so the
  browser announces them when they open.
- 2026-10-21, User Story 1. The help toggle is wired in `src/main.js` to open and close the
  panel, to keep `aria-expanded` in step, and to move the focus to the panel's heading, which
  needed a `tabindex="-1"` on that heading. T063 and T064 verify the rest of the focus
  behaviour.
- 2026-10-21, User Story 1. The renderer keeps its tile map by writing a new one from the old on
  every move rather than moving tiles inside it. A slide to the right can put a tile into a cell
  that another tile is about to leave, and moving them in place loses the tile that is leaving.
- 2026-10-21, User Story 5. Added swipe resolution, pointer input with setPointerCapture and
  touch-action, manifest, service worker with precache and navigation/asset strategies, service worker
  registration, icons, responsive board styles, and iOS install steps in the help panel.
- 2026-10-21, User Story 6. Added themes (system/light/dark/contrast/colorblind), theme
  selection and persistence, lazy-loaded audio with gain cap, sound toggle with aria-pressed,
  and reduced-motion support across styles and animations.
- 2026-10-22, remediation. T063 was closed by the browser rather than by `trapFocus`: the three
  dialogs are native `<dialog>` elements opened with `showModal()`, which makes the rest of the
  page inert and returns focus on close, so the hand-written `trapFocus` was redundant and has
  been removed (T078). T060 to T064 are ticked on the strength of the code and its tests; the
  manual screen-reader and keyboard pass in T065 is the check that proves them for a person, and
  it has not been run. T071 (browser matrix, airplane mode) and T072 (merge) are also still open.

