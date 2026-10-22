# Research: Modern Style, Smoother Motion, and Sound Fixes

**Feature**: 002-modern-style-audio | **Date**: 2026-10-22 | **Plan**: [plan.md](plan.md)

Every unknown in the Technical Context is resolved here. Decisions are numbered R-01 to R-12 and are
cited from the plan, data model, contracts, and quickstart.

## R-01. Why no audio comes out

- **Finding**: Measured in Chromium against the shipped code (instrumented `AudioContext`):
  - The four files in `assets/audio/` are byte-identical (same MD5), each 0.100 s long, mono, 44.1 kHz.
  - Decoded, each peaks at **-17.9 dBFS** with an RMS of **-21.1 dBFS**.
  - `audio.js` plays every effect through a gain of **0.3 (-10.5 dB)**. The level reaching the speaker is
    therefore a peak of about **-28 dBFS** and an RMS of about **-32 dBFS**, for one tenth of a second.
  - The playback path itself works in desktop Chromium: the context is `running` and `start()` is called
    for each move. So on desktop the sound is "played" but is a 100 ms tick far below a normal listening
    level, and identical for every event.
- **Not reproduced**: Safari and iOS. They cannot be run from this environment. Code review shows the
  likely second cause there (see R-03): the context is created in the click handler but `resume()` is
  called only after `await`ed network fetches, which on WebKit is no longer inside the user gesture, and
  the error is swallowed by an empty `catch`. A swipe is delivered as pointer events, which WebKit does not
  count as an audio-unlocking gesture either.
- **Decision**: Treat silence as two defects with two fixes. (1) The effects are far too quiet and
  identical: replace them (R-02, R-04). (2) Starting playback on WebKit is not reliable: rebuild the
  unlock logic (R-03). Prove (2) on a real iPhone in the quickstart, because it cannot be proven here.
- **Alternatives considered**:
  - Only raise the gain on the existing files: leaves four identical 0.1 s ticks and does nothing for
    WebKit.
  - Only fix the unlock: leaves effects that are inaudible even when playing.

## R-02. Make the effects at runtime from a pure recipe, not as audio files

- **Decision**: Replace the four mp3 files with five **recipes**: small data describing notes, partials,
  envelopes, and a target peak level. A pure function, `renderEffect(recipe, sampleRate)`, turns a recipe
  into an array of samples. In the browser the samples are copied into an `AudioBuffer` and played; in
  tests the same function runs in Node.
- **Rationale**:
  - **Testable**. SC-005 and SC-006 (five different effects, each peaking between -12 and -3 dBFS, within
    3 dB of each other, no clicks) become automated Node tests. With mp3 files they could not be, because
    Node has no mp3 decoder and the project allows no dependencies.
  - **Nothing to download or decode**. The sound is a few hundred bytes of data, far under the 100 KB
    budget. No fetch can fail, so "enabled while offline before ever fetched" (feature 001's edge case)
    stops being a failure mode. FR-013 holds trivially: nothing is downloaded at all.
  - **Fixes the cause directly**. The level and the character of each effect are numbers in the recipe.
  - Vanilla: only the Web Audio `AudioBuffer`, no library (Constitution I).
- **Alternatives considered**:
  - **New mp3 files made with a dev-time tool**: allowed, and still needs a fetch, a decode, and a service
    worker rule, and cannot be asserted in Node. Rejected.
  - **WAV files**: parseable in Node, but five effects at a decent sample rate approach the 100 KB budget,
    and they still need a fetch. Rejected.
  - **Live oscillator nodes**: no buffers, but the result cannot be measured offline, and envelopes click
    more easily. Rejected.
- **Spec impact**: FR-013, FR-014, SC-005, and two edge cases were reworded in the spec to say "sound" and
  "effects" rather than "sound files". No requirement was weakened.

## R-03. Unlock and track the audio context so the control never lies

- **Decision**: One `createAudio()` owns a single `AudioContext`.
  - `unlock()` is called **synchronously** from a user gesture and does three things in the same task:
    creates the context if needed, calls `resume()`, and starts a one-sample silent buffer (the standard
    WebKit unlock). It is called from the sound toggle's click, and from the first `pointerup`, `touchend`,
    `keydown`, and `click` on the page after sound is on.
  - The toggle shows "on" only when `context.state === "running"` after the unlock. If it is not running,
    the toggle shows "off" and the setting is not saved.
  - The context's `statechange` and the page's `visibilitychange` re-run `resume()`, because iOS moves the
    context to `interrupted` on a phone call or a tab switch.
  - No `await` precedes `resume()` and no `catch` swallows its result.
- **Rationale**: This is the documented way to meet WebKit's rule. It also makes FR-014 testable: a state
  machine with named states (off, arming, on, suspended) that a unit test drives with a fake context.
- **Alternatives considered**: playing a real sound as the unlock, which is audible; an unlock overlay or
  "tap to enable sound" prompt, which adds UI the spec does not ask for.

## R-04. Levels, voices, and no stacking noise

- **Decision**:
  - Every recipe carries a **target peak of -9 dBFS** (0.355). The renderer normalises to it, so the five
    peaks are equal (SC-006 asks for -12 to -3 and a spread of 3 dB). Per-effect trims keep the RMS spread
    under about 6 dB so the flourish and the tap feel equally loud.
  - Master chain: effect buffer -> gain 1.0 -> destination. A `DynamicsCompressor` was planned to stop a run
    of overlapping merges from summing past full scale, and was **measured and rejected**: in Chromium it adds
    make-up gain and acts on the attack of a short sound, so the five effects reached the output at -17.1,
    -6.3, -7.0, -5.7, and -5.7 dBFS (an 11 dB spread, against the 3 dB SC-006 allows). With no processing each
    effect measures exactly -9.0 dBFS, and the worst stack of three measured -3.4 dBFS, so the voice cap below
    is enough to stay under full scale.
  - Voice limit: at most **3 effects play at once**; a new merge within **60 ms** of the previous one
    replaces it rather than adding a layer.
  - Each buffer starts and ends with a short fade (3 ms in, 12 ms out) so there is no click.
- **Alternatives considered**: the built-in `DynamicsCompressor` (measured, uneven, see above); a soft-clip
  `WaveShaper` (measured: it changes the level of every effect by about +3.6 dB, and is not needed);
  lowering all peaks to -18 dBFS (would repeat the original problem).

## R-05. Smoother motion inside 150 milliseconds

- **Finding**: Today a slide takes 90 ms, the merge pop 120 ms, the spawn 120 ms, and `MOVE_DURATION` is a
  130 ms `setTimeout` after which the next queued input is released. The tiles already use `transform`
  (compositor friendly). What reads as stiff is: a single ease for everything; a merge "pop" that is a
  plain scale; new tiles that appear while others still slide; and input that waits on a timer rather than
  on the animation.
- **Decision** (the limit of 150 ms stays, per clarification):
  - A move is a **timeline in three overlapping parts**, all inside 150 ms: slide 0-100 ms with an
    ease-out-quart curve; merge emphasis 60-150 ms (scale 1 -> 1.12 -> 1) on the merged tile; spawn entrance
    70-150 ms (scale 0.6 -> 1, opacity 0 -> 1) on the new tile, which starts after the slide is mostly done
    so it never covers a moving tile. See [contracts/motion-contract.md](contracts/motion-contract.md).
  - Only `translate`, `scale`, and `opacity` animate. No layout properties. Tiles are positioned with
    `translate`, because the individual `scale` property is applied after it and so grows a tile about its own
    centre; positioning with `transform` would multiply the offset by the scale.
  - The move ends on the last animation's `animationend` / `transitionend`, with a 160 ms timer only as a
    safety net, instead of a fixed timer. Input stays queued during the move, capped at 2 pending moves with extra presses ignored and key-repeat
    events not queued (FR-006).
  - Durations and curves live in CSS custom properties, so the reduced-motion override stays a stylesheet
    rule (FR-007), and a test can read them (R-11).
- **Alternatives considered**: the Web Animations API (more control, but moves the reduced-motion rule into
  JavaScript); spring physics (needs a loop, cannot fit 150 ms); lengthening the move (ruled out by the
  clarification).

## R-06. Undo and new game animate, rather than redraw

- **Decision**: Undo and new game use the same layer: tiles that exist before and after **slide** to their
  places with the slide curve; tiles that vanish **fade out** over 80 ms; tiles that appear **enter** with the
  spawn entrance. A new game cross-fades the board over 150 ms. No new DOM structure is needed because the
  renderer already keeps a map of tile elements and "writes a new map from the old on every move".
- **Alternatives considered**: a full-board fade for undo (loses the sense of the move being reversed).

## R-07. Dialog transitions

- **Decision**: Dialogs enter with a keyframe animation on `dialog[open]` and `dialog[open]::backdrop`
  (opacity and a small scale/translate, 160 ms), and leave through a `data-closing` attribute that plays the
  reverse for 120 ms before `close()` is called. Both are under a `prefers-reduced-motion: no-preference`
  media query, so with reduced motion `close()` is immediate. Keyframes are used instead of `@starting-style`
  and `transition-behavior: allow-discrete` because those are not yet in every supported browser.
- **Alternatives considered**: `@starting-style` (smaller CSS, but not supported in the oldest of the two
  latest stable Safari versions at the time of writing).

## R-08. The calm and soft palette, with verified contrast

- **Decision**: One design-token set, with a **hue ladder** shared by light and dark themes. Tile hues move
  from cool blue (215 degrees) through teal, green, and yellow to orange, coral, and rose (345 degrees) as
  the value grows, with moderate saturation. Text on each tile is whichever of near-black or white passes.
  One indigo accent is used for the primary button and focus. Values above 1024 get a distinct deep plum
  tile with gold text (light) or a pale lavender tile (dark).
- **Verified**: The candidate palette was computed with the WCAG formula (see
  [contracts/theme-tokens.md](contracts/theme-tokens.md)). All 11 light tile pairs and all 11 dark tile pairs
  are at least 4.5:1, the lowest being 4.92:1 and 5.08:1; text, accent, border, and focus pairs pass in both
  themes. The existing `tests/unit/contrast.test.js` already enforces these minimums and will fail on any
  later edit that breaks one.
- **High-contrast and colour-blind-safe**: The high-contrast theme keeps its stark black, white, and bright
  tile set (already 7:1 or better) and takes the new shapes, spacing, and focus treatment. The colour-blind-safe
  theme keeps its Okabe-Ito based tile colours, which are chosen for red-green safety, and takes the new
  surfaces and accent. A new automated check simulates deuteranopia and protanopia (R-11).
- **Alternatives considered**: a saturated, jewel-toned ladder (rejected in clarification); a separate dark
  ladder with different hues (breaks the "same character in every theme" intent).

## R-09. Typography, shape, and depth without a download

- **Decision**: System font stack only: `ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI",
  Roboto, sans-serif`, with `font-variant-numeric: tabular-nums` on scores and tiles. A modular type scale in
  tokens. Corner radius 14 px for the board and 10 px for tiles; soft two-layer shadows; a 1 px inner
  highlight on tiles for gentle depth. Gradients are CSS only, no images.
- **Rationale**: No web font means no download, no CSP exception, and no layout shift (FR-025, Constitution V).
- **Alternatives considered**: a bundled variable font (adds tens of KB and a font-loading flash).

## R-10. Nothing stored changes

- **Decision**: Theme names, setting keys, the game record, and the best-score record are untouched. The
  theme values are the same strings (`system`, `light`, `dark`, `contrast`, `colorblind`), so a player's saved
  choice carries over (FR-023, FR-024). No migration is needed.

## R-11. How each requirement is checked

| Requirement | Check | Where |
|---|---|---|
| SC-005, SC-006 (five effects, levels, no clicks) | Node tests on `renderEffect` output: peak between -12 and -3 dBFS, peak spread within 3 dB, first and last samples near zero, no two buffers equal, duration at least 80 ms | `tests/unit/sound-synth.test.js` |
| FR-014, SC-007 (control never lies) | Unit test of the audio state machine with a fake context: "on" only when running, "off" when resume fails or the context stays suspended | `tests/unit/audio.test.js` |
| FR-005, SC-003 (150 ms) | Static test that reads the timeline custom properties and asserts every motion ends by 150 ms | `tests/unit/motion.test.js` |
| FR-007 (reduced motion) | Static test that every `animation` / `transition` rule is neutralised in the reduced-motion block | `tests/unit/motion.test.js` |
| FR-021, SC-008 (contrast) | Existing contrast test, extended to the new tokens | `tests/unit/contrast.test.js` |
| FR-022, SC-008 (colour-blind) | Deuteranopia and protanopia simulation, and a minimum difference between neighbouring tile colours | `tests/unit/cvd.test.js` |
| FR-025, SC-010 (size, no third party) | Existing CSP test, plus a size check in the quickstart | `tests/unit/csp.test.js`, quickstart |
| SC-001, SC-002, SC-007 on iOS (feel, smoothness, unlock) | Moderated session and a real-iPhone check | quickstart |
| SC-003 frame rate | Chrome performance trace on a mid-range phone | quickstart |

Smoothness, sound quality, and WebKit's audio rule cannot be proven in Node. They are release gates run by
hand, recorded in a verification log like feature 001's.

## R-12. Scope and governance

- **Decision**: No constitution amendment is needed. The feature is not on the out-of-scope list, adds no
  runtime dependency or third-party content, and leaves every budget and the 150 ms limit unchanged.
- **Traceability gap**: The constitution asks specs to cite BRD requirement IDs. This feature has none,
  because it is a refresh. The spec says so in its Assumptions; the plan records the same.
