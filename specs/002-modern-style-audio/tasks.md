---
description: "Task list for the modern style, smoother motion, and sound fixes"
---

# Tasks: Modern Style, Smoother Motion, and Sound Fixes

**Input**: Design documents from `/specs/002-modern-style-audio/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. Constitution Principle III requires a test before any behaviour change, and the plan
([research.md](research.md), R-11) moves sound loudness, the audio state machine, motion timing, and
colour checks into Node tests. Smoothness, sound on real phones, and the look cannot be tested in Node;
they are release gates (T049 to T053).

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered
as an increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 smooth motion, US2 sound, US3 look and feel, US4 palette)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/`, `tests/` at the repository root, as in feature 001. `src/core/` is not touched.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Record the starting point so the budgets and the "nothing else changed" rule can be shown.

- [x] T001 Create `specs/002-modern-style-audio/verification.md` as the running log of the release gates from `quickstart.md`, and record the baseline in it: the current asset sizes (everything except sound, and the four mp3 files), the current test count, and the current slide, merge, and spawn durations from `src/styles/board.css` (SC-010, SC-011)
- [x] T002 [P] Run `npm test` and `node scripts/check-specs.mjs` on the branch before any change and note that both pass in `specs/002-modern-style-audio/verification.md`, so any later failure is known to be new

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared tokens and timeline properties that the motion, look, and palette stories all use.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Add the shared shape, depth, and type tokens to `:root` in `src/styles/base.css`: `--radius-board`, `--radius-tile`, `--radius-control`, `--shadow-tile`, `--shadow-raised`, `--tile-highlight`, `--font-ui` (system stack only), and the type scale, with the values in `contracts/theme-tokens.md` (FR-015, FR-025)
- [x] T004 Add the motion timeline custom properties to `:root` in `src/styles/board.css`: `--slide-duration: 100ms`, `--merge-delay: 60ms`, `--merge-duration: 90ms`, `--spawn-delay: 70ms`, `--spawn-duration: 80ms`, `--fade-duration: 80ms`, `--newgame-duration: 150ms`, replacing the current 90, 120, and 120 ms values, per `contracts/motion-contract.md` (FR-005)
- [x] T005 [P] Add the `--accent-fg` token beside `--accent` in every theme block of `src/styles/themes.css`, set to the light-theme value for the `contrast` and `colorblind` themes for now (FR-020)

**Checkpoint**: Foundation ready. The four user stories can now proceed. US1, US3, and US4 share `src/styles/board.css`, so work on those three in priority order; US2 touches only audio files and can run in parallel with any of them.

---

## Phase 3: User Story 1 - Moves that feel smooth and alive (Priority: P1) 🎯 MVP

**Goal**: Every board change glides, merges read as events, new tiles arrive without popping, and rapid input
stays exact, all inside the 150 ms limit.

**Independent Test**: Play a full game on a mid-range phone and a desktop browser, with normal motion and with
reduced motion on. Tiles travel continuously, merges are acknowledged, new tiles arrive gently, a burst of
rapid input never stutters or corrupts the board, and undo and new game animate.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Write `tests/unit/motion.test.js`: read the timeline custom properties from `src/styles/board.css` and assert that for the slide, merge emphasis, and spawn entrance `delay + duration <= 150ms`, that the new-game cross-fade is at most 150 ms, and that only `transform` and `opacity` are animated; the duration-sum assertions pass once T004 lands, so the new-game and `transform`/`opacity`-only assertions are the ones expected to fail first (FR-001, FR-005, SC-003)
- [x] T007 [P] [US1] Extend `tests/unit/motion.test.js` with the reduced-motion rule: every `animation` and `transition` declared in `src/styles/board.css` and `src/styles/base.css` is neutralised inside the `prefers-reduced-motion: reduce` block (FR-007)
- [x] T008 [P] [US1] Update `tests/unit/animations.test.js` so a move ends on the last `animationend` or `transitionend`, with a 160 ms fallback timer, and so `MOVE_DURATION` is no longer a fixed wait (R-05)
- [x] T009 [P] [US1] Extend `tests/unit/input.test.js` so a move pressed while another is animating is queued, starts as soon as the first ends, and starts no later than 150 ms after the press, with the queue capped at 2 pending moves, extra presses ignored, repeat events not queued, and no accepted move lost or doubled (FR-006)
- [x] T010 [P] [US1] Extend `tests/integration/game-flow.test.js` with a 50-move burst applied through the queue, feeding the burst as moves complete so each is accepted, asserting the board and score equal those from applying the same moves one at a time (SC-004)

### Implementation for User Story 1

- [x] T011 [US1] Rewrite the slide, merge, and spawn motion in `src/styles/board.css` to the three-part timeline: slide on `transform` with `cubic-bezier(0.25, 1, 0.5, 1)`, merge emphasis as a keyframe from scale 1 to 1.12 to 1, spawn entrance as scale 0.6 to 1 with opacity, all driven by the timeline properties (FR-001, FR-002, FR-003)
- [x] T012 [US1] Update `src/ui/animations.js` to start the timeline and resolve on the last `animationend` or `transitionend` with a 160 ms safety timer, keeping the reduced-motion path in the stylesheet (R-05, FR-006)
- [x] T013 [US1] Add the undo and new-game transitions to `src/ui/render.js`: surviving tiles slide, vanished tiles fade out over `--fade-duration`, restored tiles take the spawn entrance, and a new game cross-fades the tile layer over `--newgame-duration` (FR-004, FR-005)
- [x] T014 [US1] Wire the undo and new-game transitions in `src/main.js` so both call the new renderer paths, and keep input queued during them (FR-004, FR-006)
- [x] T015 [US1] Add the reduced-motion block to `src/styles/board.css`: every duration to 0, every animation to none, spawn and new game allowed a fade of at most 100 ms (FR-007)

**Checkpoint**: User Story 1 works on its own. Run T006 to T010; all pass.

---

## Phase 4: User Story 2 - Sound effects that work and sound good (Priority: P1)

**Goal**: Sound actually comes out, each of five events has its own soft sound, and the control never shows
"on" unless sound can play.

**Independent Test**: Turn sound on, on a desktop browser and on a phone, and trigger a move, a merge, an
undo, the win, and a game over. Each is audible, each is different, none clicks or distorts, and a reload with
sound saved as on turns it back on at the first tap.

### Tests for User Story 2 ⚠️

- [x] T016 [P] [US2] Write `tests/unit/sound-synth.test.js`: render each recipe and assert a peak between -12 and -3 dBFS, the five peaks within 3 dB, an RMS spread of at most 6 dB, a duration of 0.08 to 1.2 s, first and last samples within 0.001 of zero, and no two effects with equal samples (FR-008, FR-009, FR-010, SC-005, SC-006)
- [x] T017 [P] [US2] Rewrite `tests/unit/audio.test.js` against a fake `AudioContext`: the state moves off, arming, on, suspended as in `data-model.md`; the control is "on" only when the context is running; a failed or suspended `resume()` leaves it "off"; nothing is created before the first enable; `play` does nothing unless the state is on; at most 3 voices and a merge within 60 ms replaces the previous merge; and a pure `effectFor(event)` in `src/services/audio.js` that maps `move`, `merge`, `undo`, `undo-from-game-over`, `win`, and `gameover` to exactly one effect each, with undo never mapping to `move` (FR-008, FR-011, FR-012, FR-013, FR-014)
- [x] T018 [P] [US2] Add the reload cases to `tests/unit/audio.test.js`: a saved "on" shows the control "off" until the first gesture, then the first `unlock()` turns it on and keeps the saved choice, and a gesture that cannot start sound leaves it off with the choice kept, including a failed first gesture after a reload keeping the saved "on" while a failed toggle by the player saves "off" (FR-014)

### Implementation for User Story 2

- [x] T019 [US2] Create `src/services/sound-synth.js`: the five recipes (`move`, `merge`, `undo`, `win`, `gameover`) and the pure `renderEffect(recipe, sampleRate)` that returns normalised mono samples with a 3 ms fade-in and 12 ms fade-out, per `contracts/audio-contract.md` (FR-008, FR-009, FR-010)
- [x] T020 [US2] Rewrite `src/services/audio.js` around the state machine: one `AudioContext`, `enable()` and `unlock()` that call `resume()` synchronously inside the gesture with no `await` before it and no swallowed error, a silent-buffer unlock, buffers rendered on the first enable only, a gain into a `DynamicsCompressor`, the voice cap and merge replacement, and `statechange` handling (FR-011, FR-013, FR-014, R-03, R-04)
- [x] T021 [US2] Update `src/main.js` to play the five effects on their events using `effectFor` (move, merge, undo including from the game-over dialog, win, game over), to call `unlock()` from the sound control click and from the first `pointerup`, `touchend`, `keydown`, and `click` while sound is enabled and suspended, to re-resume on `visibilitychange`, and to turn the control on or off from `state()` (FR-012, FR-014)
- [x] T022 [P] [US2] Remove the four files in `assets/audio/` and delete the audio entries from `src/ui/strings.js` only if unused; leave the sound-control label strings in place (FR-013)
- [x] T023 [P] [US2] Bump `CACHE_NAME` in `sw.js`, add `./src/services/sound-synth.js` to `PRECACHE_ASSETS`, and update `tests/unit/precache.test.js` so it asserts that module is listed, no audio path is listed, and no runtime audio rule exists (R-02)
- [x] T024 [P] [US2] Update `specs/002-modern-style-audio/contracts/audio-contract.md` and `data-model.md` so the reload behaviour reads "the control shows off until the first gesture, then turns on by itself and the saved choice is kept", matching the clarification, and the failed-unlock rule split into a player's own toggle (saves off) and a reload restore (keeps on) (FR-014)
- [x] T025 [P] [US2] Add a short superseded-by note at the top of the audio section of `specs/001-1024-browser-game/contracts/offline-contract.md` pointing to `specs/002-modern-style-audio/contracts/audio-contract.md`, so the two contracts do not disagree

**Checkpoint**: User Story 2 works on its own. Run T016 to T018; all pass.

---

## Phase 5: User Story 3 - A modern look and feel (Priority: P2)

**Goal**: One consistent calm and soft visual language across the board, tiles, scores, controls, and
dialogs, with polished states and transitions.

**Independent Test**: Open the redesign beside the previous release with five testers. It reads as clearly
more modern, every control is recognisable, and nothing is harder to read.

### Tests for User Story 3 ⚠️

- [ ] T026 [P] [US3] Extend `tests/unit/dialogs.test.js`: closing a dialog sets `data-closing`, waits for the leave duration, then calls `close()`, and with reduced motion `close()` runs at once (FR-017, FR-007)
- [ ] T027 [P] [US3] Extend `tests/unit/styles.test.js` so every control (`button`, `select`, the toggle) defines a hover, an `:active`, and a `:focus-visible` rule, that the focus outline is never `none`, and that no rule loads a font or image from another origin (FR-016, FR-025)
- [ ] T028 [P] [US3] Extend `tests/unit/a11y.test.js` so every control in `index.html` keeps a touch target of at least 24 by 24 CSS pixels in the stylesheet, and assert the current control ids (`new-game`, `undo`, `help-toggle`, `theme-select`, `sound-toggle`, and the dialog buttons) are all still in `index.html` (FR-019)

### Implementation for User Story 3

- [ ] T029 [US3] Restyle the page shell, header, score panels, and controls in `src/styles/base.css` with the shape, depth, type, and spacing tokens, including hover, press, and focus states that take 120 ms and respect reduced motion (FR-015, FR-016)
- [ ] T030 [US3] Restyle the board, cells, and tiles in `src/styles/board.css`: radius, soft two-layer shadow, a 1 px inner highlight, and tabular numbers, keeping the board square and the 24 px targets (FR-015, FR-018, FR-019)
- [ ] T031 [US3] Add the dialog enter keyframes (160 ms, opacity and a 6 px rise) on `dialog[open]` and `dialog[open]::backdrop` in `src/styles/base.css`, under a `no-preference` motion query (FR-017)
- [ ] T032 [US3] Add the leave transition to `src/ui/dialogs.js`: set `data-closing`, wait 120 ms, then `close()`, and call `close()` immediately when reduced motion is on (FR-017)
- [ ] T033 [US3] Check the layout at 320 px, in landscape, and at 200% text, and fix any clipping in `src/styles/base.css` (FR-018, SC-012)

**Checkpoint**: User Story 3 works on its own. Run T026 to T028; all pass.

---

## Phase 6: User Story 4 - A stylish colour palette in every theme (Priority: P2)

**Goal**: The calm and soft palette in all four themes, with tile colours progressing from cool to warm, and
every existing contrast and colour-blind commitment still met.

**Independent Test**: Cycle through all four themes and the system default. Each looks deliberate, tile
values progress through a recognisable colour sequence, and the contrast and colour-blind checks pass.

### Tests for User Story 4 ⚠️

- [ ] T034 [P] [US4] Extend `tests/unit/contrast.test.js` with the new pairs: `--accent-fg` on `--accent` at 4.5:1, `--accent` on `--bg` at 4.5:1, the `high` tile pair in every theme, and `--focus-ring` on both `--bg` and `--surface` at 3:1; and assert that no colour token (`--tile-*`, `--bg`, `--text`, and the rest) is declared in `src/styles/board.css`, because its `:root` value currently overrides `base.css`; watch it fail against the current tokens (FR-020, FR-021, SC-008)
- [ ] T035 [P] [US4] Write `tests/unit/cvd.test.js`: simulate deuteranopia and protanopia with the Machado matrices on the colour-blind-safe theme's tile backgrounds and assert a minimum colour difference between each pair of neighbouring values (FR-022, SC-008)
- [ ] T036 [P] [US4] Add to `tests/unit/contrast.test.js` a check that the saved theme values `system`, `light`, `dark`, `contrast`, and `colorblind` all still resolve to a defined token block in `src/styles/themes.css` (FR-023)

### Implementation for User Story 4

- [ ] T037 [US4] Replace the light palette in `:root` of `src/styles/base.css` with the verified values in `contracts/theme-tokens.md` (surfaces, text, accent, border, focus, and the eleven tile pairs) (FR-020, FR-021)
- [ ] T038 [US4] Replace the dark palette in the `dark` block and in the `prefers-color-scheme: dark` default of `src/styles/themes.css` with the verified dark values, including the lavender `high` tile (FR-020, FR-021, FR-023)
- [ ] T039 [US4] Update the `contrast` block in `src/styles/themes.css` to take the new shape, spacing, and no-shadow tokens, keeping its tile colours and 7:1 ratios, and the `colorblind` block to take the new surfaces and accent while keeping its Okabe-Ito tile set (FR-020, FR-021, FR-022)
- [ ] T040 [US4] Make the tile ladder in `src/styles/board.css` use the per-value tokens for every value including `high`, so each theme supplies its own, and remove any colour that duplicates a token (FR-020)
- [ ] T041 [US4] Confirm the stored theme names are unchanged in `src/services/persist.js` and `src/ui/themes.js` and that a saved choice and a first-visit device preference still apply (FR-023)

**Checkpoint**: All four stories work. Run `npm test`; everything passes.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, the spec follow-ups from clarification, and the release gates.

- [ ] T042 [P] Update `specs/002-modern-style-audio/spec.md` to cite feature 001's browser matrix by ID in FR-014 and SC-007, and to name the baseline release for SC-001 as the build merged as pull request 20, so the comparison stays valid (checklist items CHK006 and CHK036 in `specs/002-modern-style-audio/checklists/ux-audio.md`)
- [ ] T043 [P] Update `README.md` for the new look, the runtime sound, and the removal of the audio files
- [ ] T044 [P] Verify the asset budgets and record them in `specs/002-modern-style-audio/verification.md`: everything except sound under 300 KB, sound at 0 KB (limit 100 KB), and a player who never enables sound doing no audio work (FR-025, SC-010)
- [ ] T045 [P] Run the contrast, colour-blind, and CSP tests and record the results in `specs/002-modern-style-audio/verification.md` (SC-008, FR-025)
- [ ] T046 Confirm `package.json` still declares no `dependencies` and no `devDependencies`, preserving Principle I
- [ ] T047 Run `npm test` and `node scripts/check-specs.mjs` and confirm both pass; confirm the feature 001 tests are unchanged and still green (SC-011)
- [ ] T048 Run the automated accessibility scan in all five theme modes and record zero violations in `specs/002-modern-style-audio/verification.md` (SC-009)
- [ ] T049 Run the motion check from `quickstart.md` section 4 on a mid-range phone, with a Chrome performance trace, and record the frame rate and durations in `specs/002-modern-style-audio/verification.md` (SC-003, SC-004)
- [ ] T050 Run the sound check from `quickstart.md` section 5 on desktop Chrome, Safari, and Firefox, a real iPhone, and a real Android phone, and record for each whether the control ever showed "on" while nothing was audible in `specs/002-modern-style-audio/verification.md` (FR-014, SC-005, SC-006, SC-007)
- [ ] T051 Run the moderated side-by-side session with five testers from `quickstart.md` section 3 and record the results in `specs/002-modern-style-audio/verification.md` (SC-001, SC-002)
- [ ] T052 Run the keyboard and screen-reader pass from feature 001's `quickstart.md` section 5 against the new design, plus the red-green simulation of the colour-blind-safe theme, and record both in `specs/002-modern-style-audio/verification.md` (SC-008, SC-009)
- [ ] T053 Run Lighthouse and the offline and 320 px checks from `quickstart.md` section 7 against the deployed site and record them in `specs/002-modern-style-audio/verification.md` (SC-010, SC-012)
- [ ] T054 Merge the feature branch into `main` through a pull request whose `spec-integrity` and `test` checks pass in `.github/workflows/ci.yml`, as constitution v1.1.0 requires

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T002 can run beside T001.
- **Foundational (Phase 2)**: Depends on Setup. Blocks every user story.
- **User Stories (Phase 3 to 6)**: All depend on Foundational.
  - US1, US3, and US4 all edit `src/styles/board.css`, and US3 and US4 both edit `src/styles/base.css` and `src/styles/themes.css`, so do them in order US1, US3, US4.
  - US2 shares only `src/main.js` with US1 (T014 and T021). Do US1's T014 before US2's T021, or merge carefully.
- **Polish (Phase 7)**: Depends on the stories being complete. T049 to T053 are manual gates and need a person and real devices.

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational. No dependency on other stories.
- **User Story 2 (P1)**: After Foundational. Independent of the three styling stories.
- **User Story 3 (P2)**: After Foundational. Easier after US1 because both edit `board.css`.
- **User Story 4 (P2)**: After Foundational. Easier after US3 because both edit `base.css` and `themes.css`.

### Within Each User Story

- Tests MUST be written and MUST FAIL before the implementation that satisfies them.
- Pure modules before the browser code that uses them (T019 before T020).
- Stylesheet changes before the script changes that rely on them.

### Parallel Opportunities

- All tests inside one story marked [P] touch different files and can be written together.
- US2 can run in parallel with US1 for the audio files; only `src/main.js` needs coordination.
- Within US2, T022 to T025 are all [P].
- Polish tasks T042 to T045 are [P].

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write tests/unit/motion.test.js timeline check"
Task: "Update tests/unit/animations.test.js to end on animationend"
Task: "Extend tests/unit/input.test.js for the queue"
Task: "Extend tests/integration/game-flow.test.js with a 50-move burst"
```

## Parallel Example: Stories 1 and 2

```bash
# Different files, no shared dependencies until main.js:
Task: "Create src/services/sound-synth.js with the five recipes"      # US2
Task: "Rewrite the slide, merge, and spawn motion in src/styles/board.css"  # US1
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: play it on a phone and check the burst and reduced-motion behaviour.

### Incremental Delivery

1. Setup and Foundational.
2. User Story 1, then User Story 2. Both are P1, and US2 repairs a defect, so ship it as soon as T016 to T025 pass and the real-phone check (T050) is done.
3. User Story 3, then User Story 4, which are the visual redesign. The look is judged as a whole, so finish both before the moderated session (T051).
4. Polish and the release gates.

### Parallel Team Strategy

1. One person completes Setup and Foundational.
2. Then: Developer A takes US1 then US3 then US4 (they share stylesheets); Developer B takes US2.
3. The manual gates (T049 to T053) are done by the product owner on real devices.

---

## Notes

- [P] tasks = different files, no dependencies.
- Each story should be completable and testable on its own.
- Verify tests fail before implementing.
- A test task and the implementation that satisfies it land in the same pull request. The test is written first, but the required `test` check has to be green for the pull request to merge.
- Every change reaches `main` only through a pull request whose `spec-integrity` and `test` checks pass, per constitution v1.1.0.
- T049 to T053 cannot be done in Node. They stay unticked until a person has run them; no result is recorded in `verification.md` before then.
- The sound fix cannot be proven for Safari and iPhone from a desktop. T050 is the check that does.
- Avoid: vague tasks, two tasks editing the same stylesheet at once, and cross-story changes that break independence.
- 2026-10-22, User Story 1. Tiles are now positioned with the `translate` property instead of `transform`. A merge `scale` is applied after `translate` but before `transform`, so a tile positioned with `transform` was pushed out of its cell by the scale (a tile in the far column swung about 0.37 of a cell to the right during a merge). This was already true in feature 001. `tests/unit/motion.test.js` therefore allows `translate`, `scale`, and `opacity`, and the motion contract says so.
- 2026-10-22, User Story 1. `playMove` waits on `getAnimations()` rather than `animationend`/`transitionend`, because `transitionend` does not fire for a tile that did not move and fires once per property. `MOVE_DURATION` is replaced by `MOVE_CAP` (160 ms).
- 2026-10-22, User Story 1. An undo does not track tiles across the board: a tile in the same cell with the same value stays, the others fade out and the restored ones enter. This satisfies FR-004 and is recorded in the motion contract. The reload path stays instant.
- 2026-10-22, User Story 1. Superseded feature 001 tests: the fixed-timer `MOVE_DURATION` test in `tests/unit/animations.test.js`, and the unbounded-queue test "keeps the order of the queued moves" in `tests/unit/input.test.js`, which now expects the queue to hold 2 pending moves. No rule test was touched.
- 2026-10-22, User Story 1. T004 landed in Foundational, so the duration-sum assertions of T006 passed before the story's code; the fill-mode, timeline-property, delay-zeroing, and `translate` assertions were the ones that failed first, as T006 notes.
- 2026-10-22, User Story 2. The compressor in the plan was measured and dropped. In Chromium a `DynamicsCompressorNode` with its threshold above one effect's peak still added make-up gain and acted on the attack of short sounds, so the five effects reached the output at -17.1, -6.3, -7.0, -5.7, and -5.7 dBFS. With a plain gain each measures -9.0 dBFS, and the worst stack of three measures -3.4 dBFS. T020 therefore builds a gain with no compressor, and `audio-contract.md` and `research.md` (R-04) say so.
- 2026-10-22, User Story 2. `enable()` returns a promise and `restore()` is new. WebKit settles `resume()` after the call returns, so the state is decided from the promise and `statechange`, never from the state straight after `resume()`; and a saved "on" after a reload must not create a context until the first gesture. The tests in `tests/unit/audio.test.js` drive an async `resume()` to cover this. The audio contract and data model say so.
- 2026-10-22, User Story 2. Superseded feature 001 tests: the two lazy-load tests in `tests/unit/audio.test.js` (they fetched mp3 files that no longer exist) and the audio-path assertions in `tests/unit/precache.test.js`, now replaced by assertions that `sound-synth.js` is precached and no audio file exists. No rule test was touched.

