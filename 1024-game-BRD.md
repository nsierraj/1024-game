# Business Requirements Document: 1024 Browser Game

| Field | Value |
|---|---|
| Document version | 1.0 (Draft) |
| Date | October 21, 2026 |
| Owner | [TBD] |
| Approver | [TBD] |
| Status | Draft for review |

---

## 1. Purpose

This document defines the business and functional requirements for **1024**, a single-player sliding-tile puzzle game that runs in a web browser on desktop and mobile. The player slides numbered tiles on a grid, merges equal tiles, and tries to build a tile with the value 1024.

The game is a personal portfolio project. It should show clean front-end engineering, responsive design, accessibility, and offline capability without a framework or backend.

## 2. Objectives

| ID | Objective | Measure of success |
|---|---|---|
| OBJ-1 | Deliver a complete, playable 1024 game in the browser | All functional requirements in Section 6 pass acceptance testing |
| OBJ-2 | Same experience on desktop and mobile | Passes testing on every browser in Section 8.2 |
| OBJ-3 | Showcase engineering quality for a portfolio | Vanilla HTML/CSS/JS, no runtime dependencies, Lighthouse scores of 90+ in all categories |
| OBJ-4 | Accessible to players with disabilities | Meets WCAG 2.2 Level AA |
| OBJ-5 | Playable without a network connection | Installs as a PWA and runs fully offline after first load |

## 3. Scope

### 3.1 In scope (v1)

- Classic 4x4 board, win condition at the 1024 tile
- Endless mode: option to keep playing after reaching 1024
- Current score and best score, saved locally
- Single-step undo
- Tile slide, merge, and spawn animations
- Optional sound effects, off by default
- Light and dark themes, plus a small set of color themes
- Keyboard (arrow keys) and touch swipe controls
- Installable Progressive Web App with offline play
- WCAG 2.2 AA accessibility

### 3.2 Out of scope (v1)

- User accounts, login, or cloud sync
- Online or global leaderboards
- Any backend, API, or server-side storage
- Selectable board sizes (3x3, 5x5, 6x6)
- Mouse drag and WASD controls
- Multi-level or unlimited undo
- Monetization (ads, in-app purchases)
- Analytics or tracking
- Multiplayer
- Native app store distribution

## 4. Stakeholders

| Role | Name | Responsibility |
|---|---|---|
| Product owner | [TBD] | Scope, priorities, sign-off |
| Developer | [TBD] | Build, test, deploy |
| Players | General public (portfolio visitors) | Play the game, give informal feedback |

## 5. Assumptions and constraints

### 5.1 Assumptions

- Players use a current browser with JavaScript enabled.
- The game is hosted as static files on any static host (for example GitHub Pages).
- Browser local storage is available. If it is not (for example private browsing with storage blocked), the game still runs and simply does not persist data.

### 5.2 Constraints

- Built with vanilla HTML, CSS, and JavaScript. No frameworks and no runtime third-party libraries.
- No backend. All state lives in the browser.
- No personal data is collected or transmitted.

## 6. Functional requirements

Priority key: **M** = Must have, **S** = Should have, **C** = Could have.

### 6.1 Board and tiles

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | The board is a 4x4 grid of 16 cells. | M |
| FR-2 | A new game starts with two tiles placed in random empty cells. | M |
| FR-3 | Each new tile has the value 2 (90% chance) or 4 (10% chance). | M |
| FR-4 | After every valid move, one new tile spawns in a random empty cell. | M |
| FR-5 | A move that does not change the board is not a valid move. No tile spawns and the move count does not change. | M |

### 6.2 Movement and merging

| ID | Requirement | Priority |
|---|---|---|
| FR-6 | The player can move all tiles up, down, left, or right. Tiles slide as far as possible in that direction. | M |
| FR-7 | Two tiles with the same value that collide during a move merge into one tile with double the value. | M |
| FR-8 | A tile can merge only once per move. Example: a row of `2 2 2 2` moved left becomes `4 4 _ _`, not `8 _ _ _`. | M |
| FR-9 | When three equal tiles line up, the two closest to the move direction merge first. Example: `2 2 2 _` moved left becomes `4 2 _ _`. | M |

### 6.3 Scoring

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | The score increases by the value of each newly merged tile. Merging two 8s adds 16 points. | M |
| FR-11 | The current score is shown at all times during play. | M |
| FR-12 | The best score is shown at all times and is saved in local storage across sessions. | M |
| FR-13 | When the current score passes the best score, the best score updates in real time. | M |
| FR-14 | A brief score-gain indicator (for example "+16") appears when points are added. | S |

### 6.4 Win, endless mode, and game over

| ID | Requirement | Priority |
|---|---|---|
| FR-15 | When a 1024 tile is created for the first time in a game, the game shows a win message. | M |
| FR-16 | The win message offers two choices: **Keep playing** (endless mode) and **New game**. | M |
| FR-17 | In endless mode, play continues with no further win messages. Tiles can grow past 1024 (2048, 4096, and so on). | M |
| FR-18 | The game is over when the board is full and no adjacent tiles share a value. | M |
| FR-19 | On game over, the game shows the final score and a **Try again** button. | M |
| FR-20 | Tiles above 1024 have distinct, readable styling. | S |

### 6.5 Undo

| ID | Requirement | Priority |
|---|---|---|
| FR-21 | The player can undo the last valid move once. Undo restores the board, score, and best score to their state before that move. | M |
| FR-22 | After an undo, the undo control is disabled until the player makes another valid move. | M |
| FR-23 | Undo is disabled at the start of a new game. | M |
| FR-24 | Undo is available from the game-over screen, so the player can step back from a final move. | S |

### 6.6 Game controls and persistence

| ID | Requirement | Priority |
|---|---|---|
| FR-25 | A **New game** button is always visible. If a game is in progress, it asks for confirmation first. | M |
| FR-26 | The current game state (board, score, win status, undo state) is saved in local storage after every move. | M |
| FR-27 | Reloading the page or reopening the app resumes the saved game. | M |
| FR-28 | Settings (theme, sound) are saved in local storage. | M |

### 6.7 Input

| ID | Requirement | Priority |
|---|---|---|
| FR-29 | On desktop, the four arrow keys move the tiles. | M |
| FR-30 | On touch devices, a swipe on the board moves the tiles in the swipe direction. | M |
| FR-31 | A swipe must travel a minimum distance before it counts as a move, so taps and small accidental touches are ignored. | M |
| FR-32 | Swiping on the board does not scroll the page, zoom, or trigger browser back/forward gestures. | M |
| FR-33 | Inputs received during a running animation are queued or ignored in a consistent way, so fast play never corrupts the board. | M |

### 6.8 Animations and sound

| ID | Requirement | Priority |
|---|---|---|
| FR-34 | Tiles animate when they slide, merge, and spawn. | M |
| FR-35 | Slide and merge animations finish within 150 ms so play feels responsive. | S |
| FR-36 | When the operating system "reduce motion" setting is on, animations are removed or reduced to simple fades. | M |
| FR-37 | Sound effects play for moves, merges, win, and game over. | S |
| FR-38 | Sound is off by default. A visible toggle turns it on and off. | M |
| FR-39 | Sound assets are bundled locally so they work offline. | M |

### 6.9 Themes

| ID | Requirement | Priority |
|---|---|---|
| FR-40 | The game supports a light theme and a dark theme. | M |
| FR-41 | On first visit, the theme follows the operating system color-scheme setting. | M |
| FR-42 | The player can switch themes manually, and the choice overrides the system setting. | M |
| FR-43 | At least two additional color themes are available. | C |
| FR-44 | Every theme meets the contrast requirements in Section 7.2. | M |

### 6.10 Help

| ID | Requirement | Priority |
|---|---|---|
| FR-45 | A short "How to play" section explains the goal and the controls. | S |

## 7. Non-functional requirements

### 7.1 Performance

| ID | Requirement |
|---|---|
| NFR-1 | Animations run at 60 frames per second on current mid-range phones. |
| NFR-2 | First load completes in under 2 seconds on a fast 4G connection. |
| NFR-3 | Total transfer size of all assets is under 300 KB, excluding optional sound files. |
| NFR-4 | Lighthouse scores are 90 or higher for Performance, Accessibility, Best Practices, and SEO. |

### 7.2 Accessibility (WCAG 2.2 AA)

| ID | Requirement |
|---|---|
| NFR-5 | The full game is playable with a keyboard alone, including all buttons, dialogs, and settings. |
| NFR-6 | Focus is always visible, and focus moves into dialogs when they open and back when they close. |
| NFR-7 | Text and tile numbers meet a contrast ratio of at least 4.5:1. Non-text UI elements meet at least 3:1. |
| NFR-8 | Tile values are always shown as numbers. Color is never the only way to tell tiles apart. |
| NFR-9 | A live region announces score changes, the win message, and game over to screen readers. |
| NFR-10 | The board exposes its state to assistive technology, for example as a labeled grid where each cell reads its value or "empty." |
| NFR-11 | Touch targets for buttons are at least 24x24 CSS pixels (WCAG 2.2 target size minimum). |
| NFR-12 | Text can be zoomed to 200% without loss of content or function. |
| NFR-13 | The reduce-motion behavior in FR-36 is in place. |

### 7.3 Responsive design

| ID | Requirement |
|---|---|
| NFR-14 | The layout works from 320 px wide phones up to large desktop monitors. |
| NFR-15 | The board scales to fit the screen and stays square. |
| NFR-16 | The game works in both portrait and landscape orientation on phones and tablets. |
| NFR-17 | No horizontal scrolling at any supported width. |

### 7.4 Offline and installation (PWA)

| ID | Requirement |
|---|---|
| NFR-18 | The game includes a web app manifest with name, icons, theme color, and standalone display mode. |
| NFR-19 | A service worker caches all assets on first load, so the game runs fully offline afterward. |
| NFR-20 | The game can be installed to the home screen on Android and iOS and as an app on desktop Chrome and Edge. |
| NFR-21 | When a new version is deployed, the service worker updates the cache without breaking a game in progress. |

### 7.5 Privacy and security

| ID | Requirement |
|---|---|
| NFR-22 | No personal data, cookies, analytics, or third-party scripts. |
| NFR-23 | The game is served over HTTPS (required for service workers). |
| NFR-24 | A strict Content Security Policy allows only same-origin resources. |

### 7.6 Code quality

| ID | Requirement |
|---|---|
| NFR-25 | Game logic (board, moves, merges, scoring, win/lose checks) is separate from rendering and input handling. |
| NFR-26 | Game logic has automated unit tests covering all rules in Sections 6.1 to 6.5. |
| NFR-27 | Source code is readable and documented well enough to serve as a portfolio sample. |

## 8. Platform and browser support

### 8.1 Devices

- Desktop and laptop computers (Windows, macOS, Linux)
- Smartphones (iOS, Android)
- Tablets (iPadOS, Android)

### 8.2 Browsers

The latest two stable versions of:

| Platform | Browsers |
|---|---|
| Desktop | Chrome, Edge, Firefox, Safari |
| iOS / iPadOS | Safari |
| Android | Chrome |

Other browsers built on these engines (for example Samsung Internet or Brave) are expected to work but are not formally tested.

## 9. User stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-1 | Player on desktop | move tiles with the arrow keys | I can play quickly without a mouse |
| US-2 | Player on a phone | swipe to move tiles | the game feels natural on a touchscreen |
| US-3 | Player | see my score and best score | I know how I'm doing and have a target to beat |
| US-4 | Player | undo my last move | I can recover from one mistake |
| US-5 | Player | keep playing after reaching 1024 | I can chase a higher score |
| US-6 | Player | close the browser and come back later | I don't lose my game |
| US-7 | Player who prefers dark interfaces | use a dark theme | the game is comfortable to look at |
| US-8 | Player using a screen reader | hear the board state and score | I can play without seeing the screen |
| US-9 | Player sensitive to motion | play with reduced animations | the game doesn't cause discomfort |
| US-10 | Player | install the game and play offline | I can play on a plane or without signal |

## 10. Acceptance criteria (summary)

The release is accepted when:

1. Every **Must have** requirement in Sections 6 and 7 passes testing.
2. The game is tested and working on every browser in Section 8.2, on at least one real phone per mobile platform.
3. All unit tests for game logic pass.
4. An automated accessibility scan (for example axe) reports no violations, and a manual keyboard and screen-reader pass (VoiceOver and NVDA or TalkBack) completes a full game.
5. Lighthouse scores meet NFR-4.
6. The installed PWA starts and plays a full game with the device in airplane mode.

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Swipe gestures conflict with browser scroll, pull-to-refresh, or back gestures on mobile | Moves don't register or the page navigates away | Use `touch-action: none` on the board and test on real iOS and Android devices |
| iOS Safari PWA limits (storage eviction, install flow) | Saved games or best score lost on iPhone | Keep stored data small, document the iOS install steps in "How to play" |
| Rapid input during animations corrupts board state | Wrong tiles or scores | Keep logic state separate from visual state and apply moves to logic immediately (NFR-25, FR-33) |
| Theme colors fail contrast at high tile values | Accessibility failure | Check every theme against NFR-7 before release |
| Audio autoplay rules block sounds | Sound fails silently | Sound starts only after a user action, which off-by-default already ensures |

## 12. Glossary

| Term | Definition |
|---|---|
| Tile | A square on the board holding a number (a power of 2) |
| Merge | Two equal tiles combining into one tile with double the value |
| Valid move | A move that changes the position or value of at least one tile |
| Endless mode | Continued play after the 1024 tile is reached |
| PWA | Progressive Web App: a website that can be installed and run offline |
| WCAG | Web Content Accessibility Guidelines, published by the W3C |
| Live region | A page area that screen readers announce automatically when its content changes |

## 13. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Product owner | [TBD] | | |
| Approver | [TBD] | | |
