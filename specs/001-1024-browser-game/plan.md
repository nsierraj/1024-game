# Implementation Plan: 1024 Browser Game

**Branch**: `001-1024-browser-game` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-1024-browser-game/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Build the complete 1024 sliding-tile puzzle as a static, installable browser application: a pure
game-logic core that is unit-tested without a browser, a DOM presentation layer, and a small set
of browser services (storage, audio, offline cache, themes, announcements).

The technical approach is fully determined by two documents. The
[constitution](../../.specify/memory/constitution.md) fixes the stack: vanilla HTML, CSS, and
JavaScript, no runtime dependencies, no build step, no backend. The
[specification](spec.md) fixes the behavior: 68 functional and non-functional requirements, 16
measurable success criteria, 21 edge cases, and five clarifications settled in the
2026-10-21 clarification session.

Every technical decision and its rejected alternatives are recorded in
[research.md](research.md). The design that follows traces to the specification's requirement IDs
through the artifacts in [contracts/](contracts/).

## Technical Context

**Language/Version**: JavaScript (ES2022, native ES modules), HTML5, CSS3 with custom properties.
No TypeScript: a type-check step would be a build step, which Principle I forbids. Types are
documented with JSDoc and specified in [data-model.md](data-model.md).

**Primary Dependencies**: None. Not at runtime, not at development time. The test stack is Node's
built-in `node:test` runner and the development server uses only `node:http`. Both are dev-time
only, which is the only category of dependency Principle I permits.

**Storage**: Browser `localStorage`, under versioned keys `1024:v2:game`, `1024:v2:best`, and `1024:v1:settings`; a game saved under `1024:v1:game` is converted.
Every access is failure-tolerant, so a device that refuses storage degrades to a session-only game
rather than an error.

**Testing**: Node.js built-in test runner, `node --test`, with `node:test` and
`node:assert/strict`. Stable since Node 20, needs no configuration, and runs against the same
source files the browser loads. Requires Node 22 or newer (24 LTS recommended). Browser-level
checks (accessibility scan, manual keyboard and screen-reader pass, Lighthouse) are release gates
run by hand, not part of the automated suite.

**Target Platform**: The latest two stable versions of Chrome, Edge, Firefox, and Safari on
desktop; Safari on iOS and iPadOS; Chrome on Android. Must be served over HTTPS, because
installation and offline support require a secure context.

**Project Type**: Static client-side web application, installable as a Progressive Web App. No
backend, no API, no server-side state.

**Performance Goals**: 60 fps animation on current mid-range phones; slide and merge animations
complete within 150 ms; first load under 2 seconds on a fast 4G connection; non-sound assets under
300 KB; bundled sound under 100 KB; 400 KB combined.

**Constraints**: Vanilla HTML, CSS, and JavaScript only. No framework, no bundler, no runtime
dependency, no backend, no telemetry. WCAG 2.2 Level AA. HTTPS-only. Same-origin resources only.
No cookies. Single-step undo. 4x4 board.

**Scale/Scope**: One board, one player per device, one screen plus three dialogs, four themes,
four sound effects, no accounts, no sync, no server. The whole shipped game is expected to fit in
a few hundred lines of JavaScript per module.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Result | Evidence in this plan |
|---|---|---|---|
| I. Vanilla Web Stack | No framework, no runtime dependency, no build step, no backend, HTTPS | **PASS** | Zero dependencies of any kind. Native ES modules ship as source (D-02). Logic core, UI, and services are plain JavaScript modules (D-03). Static hosting over HTTPS (D-18). |
| II. Pure Game Logic Core | Logic independent of the DOM, deterministic, injectable randomness, state changes only through the core | **PASS** | `src/core/` is DOM-free and pure; the random source is injected (D-04); the contract is specified in [contracts/logic-core-api.md](contracts/logic-core-api.md). Rendering and input read state and never mutate it. |
| III. Test-First Game Rules | Automated coverage of every rule in spec sections 6.1 to 6.5, one-command suite, passes before release | **PASS** | `node --test` runs the whole suite (D-01). The core contract enumerates the rules that need a test each; `npm test` is the single command. |
| IV. Accessibility First | WCAG 2.2 AA, keyboard-only play, visible focus, dialog focus handling, text always shown, live announcements, contrast on every theme, reduced motion, 24px targets, 200% zoom | **PASS** | Grid semantics and a polite live region (D-08, D-09); pointer input is an addition to, not a replacement for, keyboard input; themes are contrast-checked per theme (D-16); reduced motion is a stylesheet-level override (D-05). |
| V. Performance, Offline, and Privacy Budgets | Under 300 KB non-sound, 60 fps, 2 s first load, quality scores 90+, offline install, no data collection, no third parties | **PASS** | Asset strategy: system fonts, inline SVG, small PNG manifest icons, lazy MP3 audio (D-14, D-15). Hand-written service worker, no workbox (D-12). No analytics, no cookies, no third-party requests (D-10, D-11, D-16). |
| Scope Boundaries | v1 scope exactly; out-of-scope list not implemented | **PASS** | No accounts, no sync, no leaderboard, no selectable board size, no mouse-drag or WASD, no multi-level undo, no monetization, no analytics, no multiplayer, no native store distribution. |
| Development Workflow and Quality Gates | Spec-driven, BRD-traceable, constitution-checked review, pull-request-only merges with required checks, six release gates | **PASS** | This plan traces to spec requirement IDs; tasks will trace to this plan; the six release gates are listed in [quickstart.md](quickstart.md). `main` is protected by the `main-branch-protection` ruleset, which requires a pull request and the `spec-integrity` and `test` checks, so this plan reaches `main` the same way every later change will. |
| Governance | Constitution supersedes, amendments documented, semver versioning, compliance review, documented exceptions with expiry | **PASS** | No violation is being requested, so no exception is needed. Constitution v1.1.0 is in force. Amendment 001 added the pull request requirement; it did not alter how this plan complies. |

**Gate result**: PASS. No violations, therefore no complexity justification is required and the
Complexity Tracking table below is intentionally empty.

### Post-design re-check

Re-evaluated after Phase 1 produced the data model, contracts, and quickstart. The only additions
made during Phase 1 were the lazy audio path, the grid ARIA structure, and the versioned storage
envelope; each of those tightens an existing principle rather than bending one. Result unchanged:
**PASS**.

Re-evaluated again against constitution v1.1.0, after
[amendment 001](../../.specify/memory/amendments/001-pull-request-requirement.md) added the pull
request requirement. That amendment expands the workflow section; it does not touch a Core
Principle, so no principle verdict changed. The workflow row above was updated to record the
ruleset. Result unchanged: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/001-1024-browser-game/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── logic-core-api.md    # Public API of the pure game-logic core
│   ├── storage-schema.md    # Persisted shapes, versioning, failure behavior
│   ├── ui-contract.md       # DOM structure, ARIA roles, theme tokens
│   └── offline-contract.md  # Service worker cache strategy, install flow
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
index.html                       # The only page. App shell plus mount points.
manifest.webmanifest             # Install metadata: name, icons, theme color, display mode
sw.js                            # Hand-written service worker: precache, cache-first, cleanup
robots.txt
package.json                     # Scripts only. No dependencies. "type": "module"

assets/
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── maskable-512.png
└── audio/
    ├── move.mp3
    ├── merge.mp3
    ├── win.mp3
    └── gameover.mp3

src/
├── main.js                      # Bootstrap: read saved state, wire modules, first paint
├── core/                        # PURE. No DOM, no storage, no timers. Unit-tested.
│   ├── constants.js             # Board size, target value, spawn distribution
│   ├── types.js                 # JSDoc typedefs for the core types
│   ├── random.js                # Injectable seeded PRNG (mulberry32)
│   ├── board.js                 # Slide, merge, occupancy, available-move checks
│   └── game.js                  # Game state machine: applyMove, undo, win, game over
├── ui/                          # Presentation. Reads state, never mutates it.
│   ├── render.js                # Tiles, score, best score, board DOM
│   ├── animations.js            # Slide, merge, spawn; reduced-motion aware
│   ├── input.js                 # Arrow keys, pointer swipe, queued input
│   ├── swipe.js                 # Pure gesture math: threshold, dominant axis
│   ├── dialogs.js               # Win, game over, and confirm dialogs
│   ├── a11y.js                  # Live region announcements, focus management
│   ├── themes.js                # Theme application and system-preference following
│   └── strings.js               # All user-facing text in one place
├── styles/                      # Plain CSS. No preprocessor, no build step.
│   ├── base.css                 # Layout, focus ring, utilities, default palette
│   ├── themes.css               # The four explicit themes and the system preference
│   └── board.css                # Board grid, cells, tiles, transitions, reduced motion
├── services/                    # Browser-only side effects
│   ├── persist.js               # localStorage read/write, failure tolerant
│   ├── settings.js              # Settings persistence and first-visit detection
│   ├── audio.js                 # Lazy load and play sound effects
│   └── sw-register.js           # Service worker registration

scripts/
├── serve.mjs                    # Dev-only static server. node:http only, no dependencies.
└── check-specs.mjs              # Spec integrity check. Zero dependencies. Runs in CI.

.github/
└── workflows/
    └── ci.yml                   # Required check: spec integrity + test suite

tests/
├── unit/
│   ├── board.test.js            # Slide, merge, tie-break, spawn rules
│   ├── game.test.js             # Scoring, win, endless, game over, undo
│   ├── random.test.js           # Determinism and distribution
│   └── persist.test.js          # Storage envelope, versioning, failure tolerance
└── integration/
    ├── game-flow.test.js        # A full game from start to game over
    └── storage-flow.test.js     # Save, reload, resume, cross-tab notice
```

**Structure Decision**: A single static web project, chosen over the multi-tier web application
layout because there is no backend to build, deploy, or operate (FR-062, Principle I). The
separation that matters is the one inside `src/`: `core/` is pure and DOM-free so it can be
unit-tested in Node, while `ui/` and `services/` own every browser side effect. That boundary is
what makes Principle II checkable rather than aspirational. `tests/unit/` and `tests/integration/`
mirror the two halves of that boundary.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations were found. The Constitution Check passed on every principle before research and
again after design, so no exception is requested and no amendment is needed to justify anything in
this plan. Amendment 001 added a workflow requirement at the product owner's request; it is a
governance change, not a response to a violation here. The empty table below is intentional.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _none_ | _none_ | _none_ |
