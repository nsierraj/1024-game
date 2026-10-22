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


## Gates that need a person

| Gate | Task | Result |
|---|---|---|
| Motion trace on a mid-range phone, 10 rapid moves | T049 | |
| Sound on desktop Chrome, Safari, Firefox, a real iPhone, a real Android phone | T050 | |
| Moderated side-by-side session with five testers | T051 | |
| Keyboard and screen-reader pass, red-green simulation | T052 | |
| Lighthouse, offline, and 320 px checks against the deployed site | T053 | |
