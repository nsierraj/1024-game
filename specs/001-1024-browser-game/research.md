# Phase 0 Research: 1024 Browser Game

**Feature**: 001-1024-browser-game
**Date**: 2026-10-21
**Purpose**: Resolve every technical unknown in the Technical Context, and record the decisions
that shape the design. Every decision below is traceable to a requirement in
[`spec.md`](spec.md) or a principle in the
[project constitution](../../.specify/memory/constitution.md).

---

## D-01: Zero-dependency test stack

- **Decision**: Use the Node.js built-in test runner, `node --test`, with `node:test` and
  `node:assert/strict`. No test framework is installed.
- **Rationale**: Constitution Principle I forbids runtime dependencies and permits only dev-time
  tooling. `node:test` is stable since Node 20, needs no configuration file, and is enough for
  everything this project tests: the rules in spec sections 6.1 to 6.5 are pure functions over
  plain arrays. Principle III and SC-003 require a suite that runs with a single command, which
  `npm test` -> `node --test` satisfies with zero install cost.
- **Alternatives considered**:
  - *Vitest / Jest*: faster to write, but they pull a dependency tree into a project whose entire
    value proposition is that it has none. Rejected.
  - *`node --test --experimental-test-coverage`*: coverage reporting is still marked experimental in
    Node, so it MUST NOT gate a release. Optional reporting only.
  - *`--watch`*: also experimental, so it is a local convenience and never part of the release
    gate.

## D-02: Native ES modules, no bundler and no build step

- **Decision**: Ship native ES modules (`<script type="module">`). No bundler, transpiler, or
  build step of any kind.
- **Rationale**: Principle I requires a game that runs with no build step. Native modules mean the
  exact files the browser loads are the exact files the tests import, so there is no build output
  that could drift from what was tested.
- **Alternatives considered**:
  - *Bundler (Vite, esbuild)*: would let us use bare module specifiers, but it introduces a build
    pipeline and a `dist/` that is not the source of truth. Rejected under Principle I.
  - *Single concatenated script*: avoids module latency, but makes the pure logic core
    (Principle II) impossible to import cleanly from tests. Rejected.

## D-03: Plain JavaScript with JSDoc types, not TypeScript

- **Decision**: Write plain JavaScript. Type information lives in JSDoc comments and in the
  data-model document.
- **Rationale**: TypeScript needs a compile step, and a compile step is a build step. The project
  is also a portfolio sample, where readable annotated JavaScript is a better showcase than
  generated output.
- **Alternatives considered**:
  - *TypeScript with `tsc --noEmit` as a dev-only check*: attractive, because it keeps types
    without emitting anything. Rejected for this iteration because it introduces a toolchain and a
    config file that a reviewer must understand before reading any game code. Revisit only if the
    project grows a second feature that shares the core.

## D-04: Injectable seeded pseudo-random generator

- **Decision**: The logic core never calls `Math.random`. It receives a random source, defaulting
  to a seeded `mulberry32` generator that the caller supplies. A 32-bit seed is stored with the
  game so a run can be replayed.
- **Rationale**: Principle II requires deterministic logic, and FR-003's 90/10 spawn distribution
  and FR-004's random placement cannot be tested without controlling the source. `mulberry32` is
  about ten lines, needs no dependency, and produces a well-distributed stream from a 32-bit seed.
- **Alternatives considered**:
  - *`Math.random` with a global override*: leaks randomness into the core and makes tests
    order-dependent. Rejected.
  - *A library such as `seedrandom`*: unnecessary for a 32-bit stream that is only ever used to
    pick one of sixteen cells.

## D-05: DOM rendering with CSS transforms and `requestAnimationFrame`

- **Decision**: Tiles are DOM elements positioned with CSS `transform: translate(...)`. Movement
  and merge animation is driven by CSS transitions, with `requestAnimationFrame` used only where a
  value must be read after layout has settled.
- **Rationale**: Transforms are composited by the browser, which is what keeps 60 fps achievable
  on mid-range phones (FR-055). CSS transitions also let the reduced-motion case be a single
  stylesheet override rather than conditional logic in the animation code (FR-036).
- **Alternatives considered**:
  - *Canvas rendering*: faster in theory, but it removes the accessibility affordances the spec
    requires (FR-051 exposes the board as a grid of cells with readable values). Rejected.
  - *Re-creating tile elements on every render*: simpler, but it kills transition continuity and
    makes the merge animation impossible. Rejected; tile elements are kept and repositioned.

## D-06: Pointer Events for swipe input

- **Decision**: Swipes are captured with Pointer Events (`pointerdown`, `pointermove`,
  `pointerup`) with `setPointerCapture`, and the board carries `touch-action: none`.
- **Rationale**: Pointer Events give one code path for mouse, touch, and pen, and `touch-action:
  none` is the specific mechanism that satisfies FR-013 (no scroll, no zoom, no back gesture) and
  FR-032 (the page never scrolls sideways). It is supported across the whole browser matrix in
  BRD section 8.2.
- **Alternatives considered**:
  - *Separate Touch and Mouse handlers*: two code paths to keep consistent, and the classic source
    of double-fire bugs. Rejected.
  - *Mouse drag*: explicitly out of scope in BRD section 3.2.

## D-07: Swipe threshold measured against the board

- **Decision**: A swipe counts when the pointer travels at least one quarter of the board's width
  or height, and the dominant axis of the gesture selects the direction.
- **Rationale**: This was settled during clarification and recorded as FR-012 and SC-014. Measuring
  against the board rather than a pixel count is what makes the behavior identical from a 320
  pixel phone to a desktop monitor.
- **Alternatives considered**: A fixed pixel threshold (behaves differently across screen sizes) and
  a velocity-only rule (hard to test and unpredictable on slow devices). Both rejected.

## D-08: Native `grid` semantics for the board

- **Decision**: The board is `role="grid"` containing `role="row"` elements, each holding
  `role="gridcell"` elements whose text content is the tile value or the word "empty".
- **Rationale**: FR-051 requires the board to expose its contents to assistive technology, and
  FR-049 requires the value to always be presented as text. The `grid` role gives screen readers
  a row and cell structure, which is the closest semantic match to a tile board.
- **Alternatives considered**:
  - *A plain table*: semantically wrong for a game board and worse for screen reader navigation.
  - *A canvas with an off-screen text mirror*: duplicates the state and creates two sources of
    truth for what the board contains. Rejected.

## D-09: A polite live region for announcements

- **Decision**: A single `aria-live="polite"` status region outside the board announces score
  changes, the win message, and game over. Score changes are throttled so that a fast sequence of
  merges does not flood the region.
- **Rationale**: FR-050 requires those three events to be announced, and a live region is the only
  reliable way to announce a change that has no focus movement.
- **Alternatives considered**:
  - *`role="alert"`*: interrupts whatever the screen reader is currently saying. Too aggressive
    for a score update. Rejected; `assertive` is reserved for the single game-over message.

## D-10: `localStorage` with versioned keys and graceful failure

- **Decision**: The game and settings are stored under versioned keys, `1024:v1:game` and
  `1024:v1:settings`. Every read and write is wrapped so that a storage failure is non-fatal: the
  game keeps running in memory and simply stops persisting.
- **Rationale**: FR-031 and FR-033 require persistence, and the spec's edge cases require the game
  to survive a device that refuses to store data. Versioned keys let a future schema change
  coexist with the old one and be migrated or discarded on read.
- **Alternatives considered**:
  - *IndexedDB*: more capacity, but it is asynchronous and heavier, and the game stores a board
    and two settings objects. Overkill for a few kilobytes.
  - *Cookies*: wrong tool, and they would conflict with the no-cookie promise in FR-061.

## D-11: Cross-tab coordination with the `storage` event

- **Decision**: Every save writes the game key. A listener for the `storage` event detects that
  another tab wrote the same key and raises the notice required by FR-034.
- **Rationale**: The `storage` event fires in other same-origin documents when local storage
  changes, and it does not fire in the tab that made the change. That gives exactly the behavior
  FR-034 asks for: the most recent save wins, and the other tab learns that the game changed
  elsewhere.
- **Alternatives considered**:
  - *`BroadcastChannel`*: good for richer messages, but it is not delivered to a tab that was
    already closed, and it does not report a save that happened before the listener attached. The
    storage event is the direct expression of the requirement.
  - *A `BroadcastChannel` alongside the storage event*: unnecessary. The notice carries no payload
    beyond "changed elsewhere".

## D-12: Hand-written service worker, and a new worker waits

- **Decision**: A hand-written `sw.js` precaches the app shell on install, serves precached assets
  cache-first, and serves navigations network-first with a cached fallback. Cache names carry the
  release version. On `activate` the worker deletes older caches. The new worker does **not** call
  `skipWaiting()` on its own.
- **Rationale**: FR-060 requires a new deployment to become available without breaking a game in
  progress. If the new worker called `skipWaiting()` and took over mid-game, a reload could pair
  an old cached shell with new assets, or replace the service worker while a game is running.
  Letting the new worker wait means it activates on the next navigation, which is exactly the
  moment a player is not mid-move.
- **Alternatives considered**:
  - *A library such as Workbox*: the largest available saving is about twenty lines of cache
    logic, and a library would break the no-dependency rule. Rejected.
  - *Cache-first for navigations*: fast, but a stale shell would be served after every deploy,
    breaking FR-060.

## D-13: iOS storage durability is best-effort, and the design must not assume otherwise

- **Decision**: The game treats every stored value as a cache that may disappear. A missing or
  unreadable saved game starts a fresh game instead of failing. The "How to play" text documents
  the iOS install steps, because iOS has no programmatic install prompt.
- **Rationale**: Apple's seven-day storage cap applies to browsing in Safari, and home screen web
  apps have their own usage counter, but eviction still happens under storage pressure on a
  least-recently-used basis. The Persistent Storage API could request protection, but on Safari it
  requires notification permission, which would contradict the no-notification, no-tracking posture
  of FR-061 and FR-068. So the design must degrade gracefully instead of demanding durability.
  This is the mitigation BRD section 11 already prescribes for the iOS storage risk.
- **Alternatives considered**:
  - *Requesting persistent storage*: requires a permission prompt on iOS, which the privacy
    posture forbids. Rejected.
  - *Moving the saved game to IndexedDB*: it is evicted under the same policies, so it buys nothing
    here.

## D-14: Lazy-loaded mono MP3 sound effects

- **Decision**: Four short sound effects, shipped as low-bitrate mono MP3 files, totalling well
  under 100 KB. They are fetched and decoded only when the player first enables sound.
- **Rationale**: FR-040 requires the sound to exist as bundled files and to be fetched only when
  sound is first enabled, and FR-057 plus FR-058 cap the combined payload at 400 KB. MP3 is
  supported by every browser in BRD section 8.2, so one file per effect avoids a codec matrix. At
  a low bitrate and short duration, four effects come to a small fraction of the 100 KB cap.
- **Alternatives considered**:
  - *Synthesizing the effects with the Web Audio API*: zero bytes, but FR-040 refers to sound
    files being loaded, and synthesized audio changes the character of the product. Rejected.
  - *Shipping WebM and MP3 per effect for better compression*: better fidelity per byte, but it
    doubles the file count and the asset count for a payload that already fits the budget.
  - *An icon-font-free system of short WAV files*: WAV is uncompressed and would exceed the cap.
    Rejected.

## D-15: System fonts, inline SVG icons, and PNG manifest icons

- **Decision**: Typography uses the platform font stack. Interface icons are inline SVG. The web app
  manifest ships small PNG icons at 192 and 512 pixels, including a maskable variant.
- **Rationale**: Zero font bytes protects the 300 KB budget in FR-058 directly. Inline SVG icons
  cost nothing beyond the markup. PNG manifest icons are needed because the manifest icon format
  is not consistently supported for SVG across the browser matrix.
- **Alternatives considered**:
  - *A webfont*: adds tens of kilobytes and a rendering delay for no benefit. Rejected.
  - *An icon font*: same objection, plus an extra request. Rejected.

## D-16: Themes as CSS custom properties with an explicit override

- **Decision**: Each theme is a set of CSS custom properties applied to a `data-theme` attribute on
  the root element. When the player has never chosen a theme, the root carries no override
  attribute and the stylesheet follows `prefers-color-scheme`, so the system setting is live.
- **Rationale**: This is what makes FR-041, FR-042, and FR-044 simultaneously true: the system
  preference applies until the player overrides it, and the override persists because the choice is
  recorded in settings.
- **Alternatives considered**:
  - *Separate stylesheets per theme*: more requests and a flash of the wrong theme. Rejected.
  - *JavaScript that reads the system preference and resolves it to a concrete theme*: that would
    stop following the system setting when it changes while the game is open. Rejected.

## D-17: English-only interface strings, kept in one place

- **Decision**: All user-facing text lives in a single strings module. The game ships in English
  only for this release.
- **Rationale**: The BRD does not mention localization, and English-only is the reasonable default
  for the first release. Keeping every string in one module means adding a language later is a
  contained change rather than a hunt through the UI code. It also keeps the asset budget
  predictable.
- **Alternatives considered**: A placeholder translation framework with a runtime lookup for one
  language would add machinery for no current benefit. Rejected, and recorded as a deferred
  decision rather than a closed door.

## D-18: Static hosting over HTTPS

- **Decision**: The game is deployed as static files to any static host that serves over HTTPS.
  GitHub Pages is the reference host because the repository already lives there.
- **Rationale**: FR-066 requires secure delivery, and both service workers and installation
  require a secure context. No server means no backend to operate, which is what Principle I and
  FR-062 require.
- **Alternatives considered**:
  - *A serverless function for the high score*: rejected outright by BRD section 3.2, which puts
    any backend out of scope.

---

## Open items carried into the implementation phase

| Item | Why it is not resolved here | Where it lands |
|---|---|---|
| Exact cache-busting revision for asset URLs | Depends on the deploy pipeline chosen | `tasks.md`, service worker task |
| Icon artwork for the four themes | Design work, not an architectural decision | `tasks.md`, theme task |
| Exact sound effect durations | Aesthetic tuning against the byte budget | `tasks.md`, audio task |
| Browser-level automated accessibility scanning | The tool is a CI-side choice, not a runtime dependency | `tasks.md`, verification task |

No unresolved NEEDS CLARIFICATION markers remain in the Technical Context.
