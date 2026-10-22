# Quickstart: Validate the Modern Style, Smoother Motion, and Sound Fixes

**Feature**: 002-modern-style-audio | **Plan**: [plan.md](plan.md)

How to prove the feature works. Sections 1 and 2 run in Node and are part of CI. Sections 3 to 7 need a
browser or a person and are release gates, recorded in a `verification.md` for this feature.

Prerequisites: Node 22 or newer, a current desktop browser, and for section 5 a real iPhone and a real
Android phone. The repository must be on the `002-modern-style-audio` branch.

## 1. Automated checks

```bash
npm test                      # the whole suite
node scripts/check-specs.mjs  # spec integrity, including this feature's spec and plan
```

Pass condition: both exit 0. The new tests are:

| Test file | Proves | Requirement |
|---|---|---|
| `tests/unit/sound-synth.test.js` | Five different effects, peaks between -12 and -3 dBFS, peaks within 3 dB, no clicks, at least 80 ms | FR-008, FR-009, FR-010, SC-005, SC-006 |
| `tests/unit/audio.test.js` | The control is "on" only when the context is running; a failed or suspended unlock shows "off"; nothing is created until the first enable | FR-011, FR-013, FR-014 |
| `tests/unit/motion.test.js` | Every slide, merge, and spawn ends within 150 ms; every animation is neutralised under reduced motion | FR-005, FR-007, SC-003 |
| `tests/unit/contrast.test.js` | Every token pair in all four themes meets its ratio | FR-021, SC-008 |
| `tests/unit/cvd.test.js` | Neighbouring tile colours stay distinguishable under deuteranopia and protanopia | FR-022, SC-008 |
| `tests/unit/csp.test.js` | Still no inline code and no other origin | FR-025 |

## 2. Rules still hold

`npm test` also runs every feature 001 test, including undo, persistence, and the CSP tests. A saved game
from before the update must resume (SC-011): put a feature 001 game record in `localStorage`, reload, and
check the board, both scores, and the theme.

## 3. Look and feel (moderated, SC-001)

Open the previous release and this branch side by side with five testers.

1. Each tester plays two minutes on each and says which feels more modern.
2. Each rates readability and ease of use.

Pass condition: at least 4 of 5 pick the new one as more modern, and none finds it harder to read or use.

## 4. Motion (SC-002, SC-003, SC-004)

1. Serve the game: `node scripts/serve.mjs`, then open `http://localhost:8080`.
2. In Chrome DevTools, record a performance trace on a mid-range Android phone while making 10 rapid moves.
   Pass condition: slide and merge finish within 150 ms and the frame rate holds 60 fps.
3. Hold an arrow key for 50 moves, then compare with the same moves applied one at a time (the integration
   test `tests/integration/game-flow.test.js` has the scripted version). Pass condition: identical boards and
   scores.
4. Turn on the operating system's reduced-motion setting. Pass condition: sliding, merging, dialog, and hover
   motion are gone or a fade.
5. Check undo and new game animate instead of jumping.

## 5. Sound on real devices (SC-005, SC-006, SC-007)

This is the check that proves the silence is fixed. Do it on each of: desktop Chrome, desktop Safari, desktop
Firefox, an iPhone (Safari), and an Android phone (Chrome). Set the device volume to about half and, on the
iPhone, make sure the ring/silent switch is not on silent.

| Step | Pass condition |
|---|---|
| Turn sound on with a tap or click | The control shows "on" |
| Make a move | A light tap is heard, with no reload and no second tap |
| Make a merge | A chime, clearly different from the tap |
| Undo | The reverse-tap |
| Reach the win and a game over | The flourish and the falling tone |
| Make 10 merges in a row | No clipping, distortion, or stacking noise |
| Switch tabs and come back, or take a call (phones) | Sound resumes on the next gesture, or the control shows "off" |
| Turn sound off | Nothing is heard; no audio work happens |

Record on each device whether the control ever showed "on" while nothing was audible. That must never happen.

## 6. Contrast, colour, and accessibility (SC-008, SC-009)

1. Cycle through system, light, dark, high-contrast, and colour-blind-safe. Each must look deliberate, with the
   tile colours moving smoothly from cool at low values to warm at high values.
2. Run an automated accessibility scan in every theme. Pass condition: zero violations.
3. Repeat the keyboard-only and screen-reader pass from feature 001's quickstart, section 5, to confirm
   focus, dialogs, and announcements still work with the new design.
4. View the colour-blind-safe theme through a red-green vision simulation. Pass condition: tile values stay
   distinguishable.

## 7. Size, speed, and offline (SC-010, SC-012)

1. Sum the sizes of everything the game ships. Pass condition: everything except sound under 300 KB, and the
   removed `assets/audio/` directory leaves the sound at 0 KB (limit 100 KB).
2. Run Lighthouse against the deployed site. Pass condition: at least 90 for performance, accessibility, best
   practices, and SEO.
3. Install the game, switch to airplane mode, and play a full game. Turn sound on while offline. Pass
   condition: it plays, and sound works (there is nothing to fetch).
4. Check 320 pixels wide, landscape on a phone, and text at 200%. Pass condition: nothing clipped and no
   sideways scroll.

## Command summary

| Purpose | Command |
|---|---|
| Run the game locally | `node scripts/serve.mjs` |
| Run the full test suite | `npm test` |
| Run one test file | `node --test tests/unit/sound-synth.test.js` |
| Check spec integrity | `node scripts/check-specs.mjs` |
