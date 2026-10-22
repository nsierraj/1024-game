# Implementation Plan: Modern Style, Smoother Motion, and Sound Fixes

**Branch**: `002-modern-style-audio` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-modern-style-audio/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Refresh the finished 1024 game without changing its rules: smoother, more polished tile motion inside the
existing 150 ms limit, a calm and soft visual redesign across all four themes, and a rebuilt sound system
that fixes the silence.

The sound diagnosis drives the design. The four shipped effects are byte-identical 0.1-second clips that
peak at about -18 dBFS and are then played at a gain of 0.3, so they reach the speaker at about -28 dBFS
([research.md](research.md), R-01). The plan replaces them with five effects **rendered at runtime from small
recipes by a pure function** (R-02). That makes loudness, distinctness, and click-freedom testable in Node,
removes every fetch and decode, and lets the audio module be rebuilt around a state machine that unlocks the
context inside the user gesture and never shows "on" unless sound can play (R-03).

Motion becomes a three-part timeline inside 150 ms, using only `translate`, `scale`, and `opacity` (R-05). The look
becomes one token set with a shared hue ladder, verified for contrast before it was written down (R-08).
Nothing stored changes (R-10).

Every decision and its rejected alternatives are in [research.md](research.md). The design traces to the
spec's requirement IDs through [data-model.md](data-model.md) and the contracts in [contracts/](contracts/).

## Technical Context

**Language/Version**: JavaScript (ES2022, native ES modules), HTML5, CSS3 with custom properties. Unchanged
from feature 001. No TypeScript, no build step.

**Primary Dependencies**: None, at runtime or at development time. The Web Audio `AudioBuffer` and
`GainNode` are browser built-ins. The scratch tools used to research this feature (ffmpeg, axe-core,
Lighthouse) are not dependencies of the project.

**Storage**: Unchanged. `localStorage` keys `1024:v2:game`, `1024:v2:best`, and `1024:v1:settings`. No new key
and no schema change (R-10).

**Testing**: Node's built-in `node:test`. New pure modules and static stylesheet checks are tested in Node.
Smoothness, sound on real devices, and the look are release gates by hand (R-11, [quickstart.md](quickstart.md)).

**Target Platform**: Unchanged: the latest two stable versions of Chrome, Edge, Firefox, and Safari on desktop;
Safari on iOS and iPadOS; Chrome on Android. HTTPS only.

**Project Type**: Static client-side web application, installable as a PWA. No backend.

**Performance Goals**: 60 fps motion on current mid-range phones; slide and merge finish within 150 ms
(unchanged); first load under 2 seconds on fast 4G; all assets except sound under 300 KB; sound under 100 KB.
The sound now takes about 0 KB of network.

**Constraints**: Vanilla stack; same-origin content only; strict CSP (no inline style attributes or scripts);
WCAG 2.2 AA; contrast 4.5:1 for text and 3:1 for interface colours in every theme (7:1 and 4.5:1 for
high-contrast); reduced-motion honoured; no web fonts.

**Scale/Scope**: One page, three dialogs, four themes plus the system default, five sound effects. Roughly
eight source files change and two are added. No new gameplay.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Result | Evidence in this plan |
|---|---|---|---|
| I. Vanilla Web Stack | No framework, runtime dependency, build step, backend, or non-same-origin content | **PASS** | Only built-in Web Audio and CSS. System fonts, no web font (R-09). No new package. |
| II. Pure Game Logic Core | Rules independent of the DOM; presentation never mutates state; animation never corrupts state | **PASS** | `src/core/` is not touched. Motion and sound read results and never write state. Input stays queued during a move (R-05), so the board is identical to one-at-a-time play (SC-004). The new `sound-synth.js` is itself pure. |
| III. Test-First Game Rules | Every rule covered by an automated test; tests first for a rule change | **PASS** | No rule changes. New behaviour that can be tested in Node is (R-11): effect loudness and distinctness, the audio state machine, motion timing, contrast, and colour-blind simulation. Tasks write each test before its code. |
| IV. Accessibility First | WCAG 2.2 AA, keyboard, focus, text always shown, live announcements, contrast on every theme, reduced motion, 24 px targets, 200% zoom | **PASS** | The existing contrast test covers the new tokens (R-08). Reduced motion is one stylesheet block (R-05, motion contract). Focus ring kept in every theme. Undo gains a sound but keeps its screen-reader announcement. |
| V. Performance, Offline, and Privacy Budgets | Under 300 KB, 60 fps, 150 ms, 2 s load, Lighthouse 90+, offline, no data collection, strict CSP | **PASS** | Only `translate`, `scale`, and `opacity` animate (R-05). The 150 ms limit is unchanged (clarification). Audio data drops from 5.5 KB of files to none (R-02). No inline style or script, so the CSP stands. |
| Scope Boundaries | v1 scope; out-of-scope list not built | **PASS** | A visual, motion, and sound refresh. No account, leaderboard, board size, control scheme, undo depth, monetization, analytics, or multiplayer. |
| Development Workflow and Quality Gates | Spec-driven, constitution-checked, PR-only merges with required checks, release gates | **PASS** | This plan follows a specification and its clarification. The work reaches `main` through a pull request with `spec-integrity` and `test`. Release gates are listed in the quickstart. |
| Governance | Constitution supersedes; amendments documented; exceptions recorded | **PASS** | No violation, so no exception or amendment (R-12). |

**Gate result**: PASS. No violations, so the Complexity Tracking table below is intentionally empty.

**Known gap, recorded not hidden**: The constitution's workflow section asks that a specification cite the BRD
requirement IDs it covers. This feature extends no BRD requirement (R-12). The spec's Assumptions say so.

### Post-design re-check

Re-evaluated after Phase 1 produced the data model, contracts, and quickstart. The design added runtime
rendering of sound, a state machine for the audio context, a motion timeline, and a token set. Each tightens an
existing principle: sound becomes testable (III), motion stays inside the existing budget (V), and every token
pair is covered by a contrast test (IV). Result unchanged: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/002-modern-style-audio/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── theme-tokens.md      # Token names, the verified light and dark values, per-theme rules
│   ├── motion-contract.md   # The 150 ms timeline, undo, new game, dialogs, reduced motion
│   └── audio-contract.md    # Recipes, renderEffect, createAudio, state machine, unlock
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
index.html                       # Sound control wiring unchanged; dialogs gain a data-closing hook
sw.js                            # Cache name bumped; no audio rule needed

src/
├── main.js                      # Wires the unlock gestures, the five sound events, undo/new-game motion
├── core/                        # NOT CHANGED
├── ui/
│   ├── animations.js            # CHANGED: timeline from CSS properties; ends on animationend
│   ├── render.js                # CHANGED: undo and new-game transitions
│   ├── dialogs.js               # CHANGED: enter and leave transitions (data-closing)
│   └── strings.js               # CHANGED only if sound-control labels need rewording
├── styles/
│   ├── base.css                 # CHANGED: tokens, type scale, shape, depth, controls, dialogs
│   ├── board.css                # CHANGED: tile ladder, motion timeline, reduced-motion block
│   └── themes.css               # CHANGED: the four themes on the new tokens
└── services/
    ├── sound-synth.js           # NEW, pure: five recipes and renderEffect
    └── audio.js                 # REWRITTEN: state machine, unlock, buffers, voices

assets/
└── audio/                       # REMOVED: the four identical mp3 files

tests/
├── unit/
│   ├── sound-synth.test.js      # NEW: loudness, distinctness, no clicks, duration
│   ├── audio.test.js            # REWRITTEN: state machine against a fake context
│   ├── motion.test.js           # NEW: timeline within 150 ms; reduced-motion coverage
│   ├── cvd.test.js              # NEW: red-green simulation of the colour-blind-safe theme
│   ├── contrast.test.js         # EXTENDED: new tokens and pairs
│   ├── dialogs.test.js          # EXTENDED: leave transition and reduced motion
│   └── precache.test.js         # UPDATED: audio no longer listed anywhere
└── integration/
    └── game-flow.test.js        # EXTENDED: 50 queued moves equal the one-at-a-time result
```

**Structure Decision**: Keep feature 001's single static project and its boundary: `core/` untouched, `ui/`
and `services/` own every browser effect. The one structural addition is `services/sound-synth.js`, a pure
module placed beside `audio.js` so the part that can be tested in Node is separate from the part that needs a
browser. Static stylesheet tests stand in for what Node cannot run, which keeps the no-dependency rule.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations were found. The Constitution Check passed on every principle before research and again after
design, so no exception is requested and no amendment is needed. The empty table below is intentional.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _none_ | _none_ | _none_ |
