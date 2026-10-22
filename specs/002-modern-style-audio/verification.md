# Verification Log: Modern Style, Smoother Motion, and Sound Fixes

The running log of the release gates from [quickstart.md](quickstart.md). Automated results are recorded
as they are measured. Gates that need a person, a real device, or a screen reader stay empty until a
person has run them; nothing is recorded for them here before then.

## Baseline (T001, T002), measured 2026-10-22 on branch `002-modern-style-audio`, before any change

| Item | Measured |
|---|---|
| Everything except sound (html, js, css, manifest, icons, `sw.js`, `robots.txt`) | 98.0 KB on disk |
| Sound: four identical mp3 files | 5.5 KB on disk |
| `npm test` | 225 tests, all passing |
| `node scripts/check-specs.mjs` | passes |
| Slide, merge, spawn durations (`src/styles/board.css`) | 90 ms, 120 ms, 120 ms |
| `MOVE_DURATION` (`src/ui/animations.js`) | 130 ms fixed timer |

## Automated gates

### User Story 1: motion (2026-10-22, desktop Chromium via Playwright; this is not phone evidence)

| Check | Result |
|---|---|
| `npm test` | 245 passing (225 before, plus the motion, animation, input, and burst tests) |
| Longest animation after a merge move | 149 ms (limit 150 ms) |
| New tile is invisible until its delay, then fades in | opacity 0 until 70 ms, 0.52 at 90 ms, 0.99 at 140 ms |
| Merged tile stays in its cell while it swells | farthest column reached 3.00 on a move to column 3; peak scale 1.125. Before the `translate` fix it reached 3.38 |
| Reduced motion | no animations run; tiles are in place on the next frame |
| Undo | 3 tiles fade out and 3 enter, all finished by 148 ms; fading tiles removed afterwards |
| New game | the tile layer fades in over 150 ms |
| Console errors under the CSP | none |


### User Story 2: sound (2026-10-22, desktop Chromium via Playwright; this is not iPhone or Android evidence)

| Check | Result |
|---|---|
| `npm test` | 284 passing |
| Shipped effects before (decoded, then played at gain 0.3) | all four identical, 0.10 s, about -28 dBFS peak at the speaker |
| New effects, as rendered | peak -9.0 dBFS each; RMS -22.2 to -18.6 dBFS (3.6 dB spread); 0.12, 0.36, 0.14, 0.85, 0.75 s |
| New effects, through the real chain in an `OfflineAudioContext` at 48 kHz | peak -9.00 dBFS for each of move, merge, undo, win, game over; three stacked (merge, win, game over) -3.36 dBFS |
| A `DynamicsCompressor`, tried and rejected | -17.1, -6.3, -7.0, -5.7, -5.7 dBFS: an 11 dB spread. Removed. |
| Turn sound on in the page | context running, control "Sound: on", setting saved on |
| Reload with sound saved on | control "Sound: off" and setting still on; no audio request made |
| First key press after that reload | control "Sound: on" |
| Click the control while it shows off after a reload | turns on (does not turn off), setting stays on |
| Turn sound off | control "Sound: off", setting saved off |
| Network requests for audio | none; `assets/audio/` is removed |
| Console errors | none |

Not proven here: that the sound is audible through speakers, that WebKit starts the context inside the gesture,
and behaviour on a phone. Those are T050.

## Gates that need a person

| Gate | Task | Result |
|---|---|---|
| Motion trace on a mid-range phone, 10 rapid moves | T049 | |
| Sound on desktop Chrome, Safari, Firefox, a real iPhone, a real Android phone | T050 | |
| Moderated side-by-side session with five testers | T051 | |
| Keyboard and screen-reader pass, red-green simulation | T052 | |
| Lighthouse, offline, and 320 px checks against the deployed site | T053 | |
