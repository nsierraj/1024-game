<!--
SYNC IMPACT REPORT
Generated: 2026-10-21
Template: constitution-template (source: core, sha256 ce7549540fa45543cca797a150201d868e64495fdff39dc38246fb17bd4024b3)
Constitution file: .specify/memory/constitution.md

Version change: unset (template scaffold only) -> 1.0.0
Bump rationale: initial ratification. No prior ratified constitution existed; the previous
  file contained only unresolved placeholders. 1.0.0 marks the first concrete governance
  baseline.

Modified principles (placeholder -> concrete):
  - PRINCIPLE_1_NAME -> I. Vanilla Web Stack (NON-NEGOTIABLE)
  - PRINCIPLE_2_NAME -> II. Pure Game Logic Core
  - PRINCIPLE_3_NAME -> III. Test-First Game Rules (NON-NEGOTIABLE)
  - PRINCIPLE_4_NAME -> IV. Accessibility First (NON-NEGOTIABLE)
  - PRINCIPLE_5_NAME -> V. Performance, Offline, and Privacy Budgets

Added sections (placeholder -> concrete):
  - SECTION_2_NAME -> Scope Boundaries and Constraints
  - SECTION_3_NAME -> Development Workflow and Quality Gates
  - Governance -> expanded with amendment procedure, versioning policy, and compliance review

Removed sections: none

Deferred items (intentionally retained placeholders / TODOs): none
-->

# 1024 Game Constitution

## Core Principles

### I. Vanilla Web Stack (NON-NEGOTIABLE)

- Implementation MUST use vanilla HTML, CSS, and JavaScript only. No frameworks, no runtime
  third-party libraries, and no build step required to run the game.
- The deliverable MUST be a static site that runs on any static host with no backend, API, or
  server-side state. All state lives in the browser.
- New runtime dependencies MUST NOT be introduced. A dependency proposal is only valid if it is
  dev-time-only tooling and the shipped asset budget in Principle V still holds.
- The game MUST be served over HTTPS, because service workers and installability depend on it.

Rationale: this is a portfolio project whose value is visible engineering clarity. A framework or
a server would hide the work behind a layer the reader cannot inspect, and would break the
offline and size guarantees that make the project credible.

### II. Pure Game Logic Core

- Board, movement, merge, scoring, win/loss, and undo logic MUST live in a module that is
  independent of the DOM. That module MUST NOT read or write markup, styles, timers, or storage.
- The logic module MUST be deterministic: the same board plus the same move MUST produce the same
  resulting board and score. Randomness (tile placement and value) MUST be injected through a
  random source so it can be seeded and asserted in tests.
- Input handling and rendering MUST read from and write through the logic core. Presentation code
  MUST NOT mutate game state directly; every state transition MUST pass through a logic-core
  function.
- Input arriving while an animation is running MUST be queued or ignored consistently. Visual
  latency MUST NEVER corrupt logical board state.

Rationale: the risk register names "rapid input during animations corrupts board state" as a
top risk. Separating logic from presentation makes that failure impossible and makes the rules
testable without a browser.

### III. Test-First Game Rules (NON-NEGOTIABLE)

- Every rule in BRD sections 6.1 through 6.5 MUST be covered by automated unit tests before the
  corresponding behavior is considered done.
- A rule change MUST land with a test that fails before the change and passes after it. No rule
  may be merged without that evidence.
- Tests MUST cover the boundary rules explicitly: one merge per move, tie-break order for
  three equal tiles, invalid moves spawning nothing, the 90/10 tile-value distribution, game-over
  detection, and undo restoring board, score, and best score.
- The full unit test suite MUST be runnable with a single command and MUST pass before any
  release or published deployment.

Rationale: slide-and-merge logic fails in subtle ways (double merges, tie ordering, off-by-one
on the last row). Executable tests are the only reliable proof that the rules still hold.

### IV. Accessibility First (NON-NEGOTIABLE)

- The game MUST meet WCAG 2.2 Level AA for every Must-have requirement. Accessibility is a
  release gate, not a follow-up task.
- The full game MUST be playable with a keyboard alone. Every button, dialog, and setting MUST be
  reachable and operable by keyboard, with a visible focus indicator and correct focus movement
  into and out of dialogs.
- Tile values MUST always be presented as text. Color MUST NOT be the only way to distinguish
  tiles, including tiles above 1024.
- Board state, score changes, the win message, and game over MUST be exposed to assistive
  technology through a labeled grid and a live region.
- Contrast MUST be at least 4.5:1 for text and 3:1 for non-text UI, verified for every theme.
- Touch targets MUST be at least 24x24 CSS pixels, text MUST survive 200% zoom without loss of
  content or function, and reduced-motion preferences MUST be honored.

Rationale: the project goal is that people with disabilities can play the game. Retrofitting
accessibility after the board logic and animations are built is what makes it fail.

### V. Performance, Offline, and Privacy Budgets

- Total transfer size of all assets MUST stay under 300 KB, excluding optional sound files.
- Animations MUST run at 60 frames per second on current mid-range phones, and slide and merge
  animations MUST finish within 150 ms so play feels responsive.
- First load MUST complete in under 2 seconds on a fast 4G connection.
- Lighthouse scores MUST be 90 or higher in Performance, Accessibility, Best Practices, and SEO.
- The game MUST run fully offline after the first load via a service worker that caches all
  assets, and a new deployment MUST update the cache without breaking a game in progress.
- The game MUST collect no personal data and MUST use no cookies, analytics, or third-party
  scripts. A strict Content Security Policy MUST allow only same-origin resources.

Rationale: these budgets are the guardrails that keep the "no framework" decision honest. They
are also the most visible quality signals in a portfolio context.

## Scope Boundaries and Constraints

- The v1 scope is exactly the in-scope list in BRD section 3.1. Anything outside it MUST be
  deferred to a later version rather than added opportunistically.
- The following are explicitly out of scope for v1 and MUST NOT be built: user accounts, login,
  cloud sync, online or global leaderboards, any backend or API, selectable board sizes, mouse
  drag and WASD controls, multi-level or unlimited undo, monetization, analytics or tracking,
  multiplayer, and native app store distribution.
- Undo is limited to a single step per move, and the undo control MUST be disabled at the start
  of a new game and until the next valid move.
- Sound effects are off by default, require an explicit user toggle, and MUST be bundled locally
  so they work offline.
- Themes MUST cover light and dark, MUST follow the operating system color scheme on first visit,
  MUST allow a manual override that persists, and MUST each satisfy the contrast requirements in
  Principle IV.
- Where the BRD and this constitution conflict on governance, this constitution wins and the BRD
  MUST be amended to match.

## Development Workflow and Quality Gates

- Work proceeds through the Spec Kit cycle: specify, plan, tasks, implement. Every feature MUST
  begin with a specification that cites the BRD requirement IDs it covers, so coverage of the BRD
  can be traced end to end.
- Implementation tasks MUST be derived from an approved specification and plan. A task that
  cannot be traced to a specification MUST NOT be started.
- Code review MUST verify compliance with all five Core Principles. A reviewer MUST reject a
  change that violates a NON-NEGOTIABLE principle unless a governance amendment is approved first.
- Before any release, the following gates MUST all pass:
  - the full unit test suite passes;
  - an automated accessibility scan reports no violations, and a manual keyboard and
    screen-reader pass (VoiceOver and NVDA or TalkBack) completes a full game;
  - Lighthouse scores meet the thresholds in Principle V;
  - the game works in the latest two stable versions of Chrome, Edge, Firefox, and Safari on
    desktop, Safari on iOS and iPadOS, and Chrome on Android, with at least one real phone tested
    per mobile platform;
  - the installed PWA starts and plays a full game in airplane mode.
- A release MUST NOT ship with a failing gate. Fixing the gate takes priority over the release.
- Source code MUST be readable and documented well enough to serve as a portfolio sample, because
  the code itself is a deliverable.

## Governance

- This constitution is the authority on how work is done in this project. Where any other
  document, default practice, or convenience conflicts with it, this constitution wins.
- Amendments require a written proposal that states the change, the rationale, and the impact on
  existing specifications, plans, and tasks. An approved amendment MUST update this file in the
  same change, with a new Sync Impact Report, an updated version, and an updated last-amended
  date.
- Versioning policy, using MAJOR.MINOR.PATCH:
  - MAJOR: a principle is removed, redefined incompatibly, or a NON-NEGOTIABLE constraint is
    relaxed.
  - MINOR: a principle or section is added, or existing guidance is materially expanded.
  - PATCH: clarifications, wording fixes, or other non-semantic refinements.
  - The initial ratified version is 1.0.0. Every amendment bumps the version; a version MUST
    NEVER be reused or edited after release.
- Compliance is reviewed at every specification, plan, and task-list gate. A principle violation
  MUST either be removed or be granted a documented exception approved by the product owner, with
  a stated compensating control and an expiry date. Exceptions MUST be recorded in the Sync
  Impact Report of the amendment that granted them and MUST be revisited when they expire.
- Where a required value is genuinely unknown at amendment time, it MUST be written as
  `TODO(FIELD_NAME): explanation` rather than guessed, and MUST be listed as a deferred item in
  the Sync Impact Report.

**Version**: 1.0.0 | **Ratified**: 2026-10-21 | **Last Amended**: 2026-10-21
