# Feature Specification: 1024 Browser Game

**Feature Branch**: `001-1024-browser-game`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Build the 1024 sliding-tile puzzle game for desktop and mobile browsers, exactly as defined in `1024-game-BRD.md`" (the command was invoked without inline arguments; the repository's Business Requirements Document is the authoritative feature description for this specification)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play a full game to a win or a game over (Priority: P1)

As a player, I want to slide tiles on a grid so that matching tiles merge, so that I can build the
1024 tile and chase a high score.

**Why this priority**: This is the game's core loop. Without it there is no product; every other
story refines an experience that must already be playable.

**Independent Test**: Start a new game and play with the arrow keys until either a 1024 tile
appears or no legal move remains. The game must produce a correct board, score, and win or
game-over outcome entirely on its own.

**Acceptance Scenarios**:

1. **Given** a fresh game with two tiles on an otherwise empty grid, **When** the player slides in
   any of the four directions, **Then** all tiles slide as far as possible in that direction, exactly
   one new tile appears in a random empty cell, and the score increases by the value of every tile
   that merged.
2. **Given** two adjacent tiles showing the same value, **When** the player slides toward them,
   **Then** the two tiles merge into one tile with double the value and the score increases by that
   new value.
3. **Given** a row of four tiles showing the same value, **When** the player slides along that row,
   **Then** the tiles form two merged pairs, not one quadruple.
4. **Given** three tiles showing the same value in a row, **When** the player slides toward them,
   **Then** the two tiles nearest the direction of travel merge and the third tile remains separate.
5. **Given** a board that is full and has no two neighbouring tiles showing the same value,
   **When** the player attempts any move, **Then** the game ends and presents the final score with a
   way to try again.
6. **Given** a direction in which no tile can move or merge, **When** the player slides in that
   direction, **Then** nothing changes: no tile is added, the score is unchanged, and the move is
   not counted.

---

### User Story 2 - Undo my last move (Priority: P2)

As a player, I want to take back the move I just made, so that a single mistake does not cost me
the game.

**Why this priority**: A single-step undo is the game's only recovery mechanism and is explicitly
in scope for the first release. It is cheap to deliver and immediately increases player trust.

**Independent Test**: Play several moves, undo once, and confirm the board, the current score, and
the best score all return to the values they had before the last move, and that a second undo is
not possible.

**Acceptance Scenarios**:

1. **Given** at least one valid move has been played, **When** the player undoes it, **Then** the
   board, the current score, and the best score all return to their values from before that move.
2. **Given** the game has just ended, **When** the player undoes from the game-over state, **Then**
   the game returns to the board as it was before the final move and play continues.
3. **Given** a move has just been undone, **When** the player has not yet made another valid move,
   **Then** the undo action is unavailable and does nothing.
4. **Given** a newly started game, **When** the player looks for an undo action, **Then** it is
   unavailable.
5. **Given** a game where the player has already used the undo, **When** the player tries to undo
   again, **Then** the board is unchanged; only one step back is ever possible.

---

### User Story 3 - Resume the game I left (Priority: P2)

As a player, I want the game to remember where I was, so that I can close the tab and come back
later without losing my progress or my best score.

**Why this priority**: Losing progress on reload is the most common way a browser game feels
unfinished. Persistence also preserves the score history that gives the game its repeat-play
value.

**Independent Test**: Play a few moves, record the board and both scores, close or reload the game,
reopen it, and confirm the board, the current score, the best score, and the undo availability are
identical.

**Acceptance Scenarios**:

1. **Given** a game in progress, **When** the player makes a move, **Then** the game is saved on the
   player's device.
2. **Given** a saved game, **When** the player reopens or reloads the game, **Then** the board,
   current score, best score, win state, and undo availability are exactly as they were.
3. **Given** a best score has been set, **When** the player returns on a later visit, **Then** the
   best score is still displayed.
4. **Given** the current score exceeds the stored best score, **When** the score updates,
   **Then** the best score updates at the same moment.
5. **Given** the device refuses to store data (for example, private browsing with storage
   blocked), **When** the player plays, **Then** the game still runs normally for that session and
   simply does not remember anything.

---

### User Story 4 - Keep playing after 1024 (Priority: P3)

As a competitive player, I want to keep going after building the 1024 tile, so that I can push my
score higher in a single session.

**Why this priority**: Endless mode is a stated first-release requirement and is what separates a
finished puzzle from a score-chasing game, but it only matters once the win state has been
reached.

**Independent Test**: Reach a 1024 tile, choose to keep playing, and confirm play continues with no
further win message and that tiles above 1024 remain distinguishable.

**Acceptance Scenarios**:

1. **Given** a 1024 tile has just been created for the first time in a game, **When** the win
   message appears, **Then** it offers exactly two choices: keep playing, or start a new game.
2. **Given** the player chooses to keep playing, **When** further moves are made, **Then** play
   continues, no further win message is shown, and tiles may exceed 1024.
3. **Given** a tile shows a value above 1024, **When** it is displayed, **Then** it is still
   readable and clearly distinguishable from other tiles.

---

### User Story 5 - Play on my phone, with or without a signal (Priority: P3)

As a player on a phone, I want the game to work on a small screen, respond to swipes, and keep
working when I have no signal, so that I can play anywhere.

**Why this priority**: A large share of players will arrive on a phone, and the promise of the
game only holds if it survives the real world. Installation and offline play are explicit
first-release goals.

**Independent Test**: Play a full game using only swipes on a phone, then install the game, switch
the device to airplane mode, and confirm a full game can still be played.

**Acceptance Scenarios**:

1. **Given** the game is open on a touch device, **When** the player swipes across the board in one
   of the four directions, **Then** the tiles move in that direction.
2. **Given** the player taps or makes a very small swipe on the board, **When** the gesture
   finishes, **Then** it is ignored and no move is made.
3. **Given** the player swipes on the board, **When** the gesture completes, **Then** the page does
   not scroll, does not zoom, and does not navigate back or forward.
4. **Given** the game has been installed on the device, **When** the device is in airplane mode and
   the game is opened, **Then** the game loads and a full game can be played.
5. **Given** the player is on a narrow phone screen, **When** the game is displayed, **Then** the
   board stays square, fits the screen, and the page never scrolls sideways.

---

### User Story 6 - Set the game up the way I like it (Priority: P4)

As a player, I want to choose my theme and decide whether sound plays, so that the game is
comfortable to play in my environment.

**Why this priority**: Preferences are a comfort feature that can be delivered once the game loop
is solid. Sound is off by default, so this story never blocks play.

**Independent Test**: Switch themes and toggle sound, reload the game, and confirm both choices
persist, that the first visit follows the device's own light or dark setting, and that the manual
choice wins from then on.

**Acceptance Scenarios**:

1. **Given** a first-time visit, **When** the game opens, **Then** it follows the device's
   light or dark preference.
2. **Given** any theme is active, **When** the player selects a different theme, **Then** the change
   takes effect immediately and overrides the device setting.
3. **Given** a manually chosen theme, **When** the player returns to the game later, **Then** the
   same theme is used.
4. **Given** sound is disabled, **When** the player plays, **Then** no sound is produced.
5. **Given** the player enables sound, **When** a move, merge, win, or game over occurs, **Then** the
   matching sound plays.
6. **Given** the player has asked the operating system to reduce motion, **When** tiles slide, merge,
   or appear, **Then** the sliding and merging motion is removed or replaced by a simple fade.

---

### User Story 7 - Play with a screen reader or without a mouse (Priority: P4)

As a player who is blind or who cannot use a pointing device, I want the game fully operable by
keyboard and narrated by my screen reader, so that I can play independently.

**Why this priority**: Accessibility is a release gate, not an enhancement, and the first release
must meet the accessibility standard in full rather than retrofitting it later.

**Independent Test**: Complete a full game using only the keyboard, with a screen reader running,
and confirm every tile value, score change, win, and game over is perceivable.

**Acceptance Scenarios**:

1. **Given** no pointing device is available, **When** the player uses only the keyboard,
   **Then** they can start a game, make every move, undo, change settings, and finish a game.
2. **Given** a dialog is open, **When** it opens and closes, **Then** keyboard focus moves into the
   dialog and returns to the control that opened it, and the focused item is always visible.
3. **Given** a screen reader is running, **When** the board is explored, **Then** each cell reads
   its tile value or "empty".
4. **Given** a screen reader is running, **When** the score changes, the game is won, or the game is
   over, **Then** the change is announced.
5. **Given** any theme, **When** text and controls are inspected, **Then** they meet the minimum
   contrast ratios and tile values are always shown as numbers, so color is never the only clue.

---

### Edge Cases

- The board is full but at least one pair of neighbouring tiles shares a value: a move that creates
  a merge is still a valid move, and play continues.
- A move is attempted while the board is in a state where nothing can move: the game does not
  treat it as a turn, and no tile appears.
- Undo is pressed when no valid move has been played: the action is unavailable and the board is
  untouched.
- Undo is pressed twice in a row: only the single most recent valid move can be reversed.
- Undo is used after the game ended: the final move is reversed and the game returns to an active
  state, including the win state if that was what ended it.
- A new game is requested while a game is in progress: the player is asked to confirm, and
  declining leaves the current game in play.
- The best score is set during a move that is then undone: the best score returns to its previous
  value rather than keeping the undone points.
- The device cannot store data: the game runs for the current session only, with no errors shown
  and no interruption to play.
- The stored game is unreadable or from an incompatible version: the game starts cleanly rather
  than failing to open.
- A swipe is too short, or a touch is a tap rather than a gesture: it is ignored, and no move is
  made.
- A swipe happens while the page is being scrolled or the browser's back gesture is triggered:
  the gesture is absorbed by the board and the player does not lose their place.
- Input arrives repeatedly in quick succession, faster than the on-screen animation finishes: the
  result is consistent every time and the board never ends up in an impossible state.
- The player reaches the 1024 tile and chooses "keep playing", then later the board fills up:
  the game ends normally with the standard game-over behavior, without a second win message.
- A tile shows a value of 2048 or higher: it remains readable and distinguishable.
- The operating system's reduced-motion preference is on: sliding, merging, and spawning motion is
  removed or reduced to a simple fade, and the game stays fully playable.
- The device's sound is blocked by the operating system's automatic-play rules: the game remains
  fully playable and simply produces no sound until the player interacts with the page.
- The player resizes the window or rotates the phone between portrait and landscape: the board
  stays square and the layout remains usable.
- The player enlarges text to 200%: no content or control is lost, clipped, or made unreachable.
- The same game is open in two tabs and the player moves in both: the most recent save takes
  effect, and the other tab shows a notice that the game was updated elsewhere.

## Clarifications

### Session 2026-10-21

- Q: What should happen if the same game is open in two browser tabs at the same time? → A: The
  most recent save wins, and the other tab shows a notice that the game was updated elsewhere

## Requirements *(mandatory)*

### Functional Requirements

Board and tiles

- **FR-001**: The game MUST present a 4x4 grid of 16 cells.
- **FR-002**: A new game MUST begin with exactly two tiles placed in random empty cells.
- **FR-003**: Each newly placed tile MUST show the value 2 for 90% of placements and the value 4
  for 10% of placements.
- **FR-004**: After each valid move, exactly one new tile MUST be placed in a random empty cell.
- **FR-005**: A move that leaves the board unchanged MUST be rejected: no tile is placed, the score
  does not change, and the move does not count as a turn.

Movement and merging

- **FR-006**: The player MUST be able to slide all tiles up, down, left, or right, and every tile
  MUST travel as far as possible in that direction.
- **FR-007**: Two tiles showing the same value that collide during a move MUST merge into a single
  tile with double the value.
- **FR-008**: A tile MUST merge at most once per move. A row of 2, 2, 2, 2 slid to the left MUST
  become 4, 4, empty, empty.
- **FR-009**: When three or more tiles showing the same value are aligned, the two tiles closest
  to the direction of travel MUST merge first. A row of 2, 2, 2, empty slid to the left MUST become
  4, 2, empty, empty.
- **FR-010**: On desktop, the four arrow keys MUST move the tiles in the matching direction.
- **FR-011**: On touch devices, a swipe across the board MUST move the tiles in the swipe
  direction.
- **FR-012**: A swipe shorter than the minimum travel distance MUST be ignored, so that taps and
  accidental touches never count as moves.
- **FR-013**: A swipe on the board MUST NOT scroll the page, zoom the page, or trigger the
  browser's back or forward navigation.

Scoring

- **FR-014**: The score MUST increase by the value of each newly merged tile. Merging two 8 tiles
  adds 16 points.
- **FR-015**: The current score MUST be visible at all times during play.
- **FR-016**: The best score MUST be visible at all times and MUST be retained across sessions.
- **FR-017**: When the current score exceeds the best score, the best score MUST update at the
  same moment.
- **FR-018**: A brief score-gain indicator, showing the points just awarded, MUST appear whenever
  points are added.

Win, endless mode, and game over

- **FR-019**: When a 1024 tile is created for the first time in a game, the game MUST show a win
  message.
- **FR-020**: The win message MUST offer exactly two choices: keep playing, and start a new game.
- **FR-021**: After the player chooses to keep playing, play MUST continue with no further win
  messages, and tiles MUST be allowed to exceed 1024.
- **FR-022**: The game MUST end when the board is full and no two neighbouring tiles share a value.
- **FR-023**: When the game ends, the game MUST present the final score and a way to try again.
- **FR-024**: Tiles showing values above 1024 MUST remain visually distinct and readable.

Undo

- **FR-025**: The player MUST be able to undo the single most recent valid move.
- **FR-026**: Undoing MUST restore the board, the current score, and the best score to their values
  from before that move.
- **FR-027**: The undo action MUST be unavailable at the start of a new game, and MUST become
  unavailable again after an undo until the player makes another valid move.
- **FR-028**: The undo action MUST be available from the game-over state.

Controls, persistence, and settings

- **FR-029**: A way to start a new game MUST be available at all times.
- **FR-030**: Starting a new game while a game is in progress MUST ask for confirmation first, and
  declining MUST leave the current game in play.
- **FR-031**: The current game, including the board, the current score, the win state, and the
  undo state, MUST be saved on the player's device after every move.
- **FR-032**: Reopening or reloading the game MUST resume the saved game exactly where it left
  off.
- **FR-033**: Settings, including theme and sound, MUST be saved on the player's device and
  restored on the next visit.

Concurrent sessions

- **FR-034**: If the same game is open in more than one tab on the same device, the most recent
  save MUST take effect, and every other tab MUST show a notice that the game was updated
  elsewhere.

Animation, motion, and sound

- **FR-035**: Tiles MUST animate when they slide, when they merge, and when they appear.
- **FR-036**: Slide and merge animations MUST be complete within 150 milliseconds.
- **FR-037**: When the operating system's reduced-motion preference is active, sliding, merging,
  and spawning motion MUST be removed or reduced to a simple fade.
- **FR-038**: Sound effects MUST be available for moves, merges, winning, and game over.
- **FR-039**: Sound MUST be off by default and MUST be switchable through a visible control.
- **FR-040**: Sound MUST remain available with no network connection.

Themes

- **FR-041**: The game MUST offer a light theme and a dark theme.
- **FR-042**: On a first visit, the active theme MUST follow the operating system's light or dark
  preference.
- **FR-043**: The player MUST be able to choose a theme manually, and the manual choice MUST
  override the operating-system preference and persist across visits.
- **FR-044**: The game MUST offer at least two additional color themes.
- **FR-045**: Every theme MUST satisfy the minimum contrast ratios defined in FR-049.

Help

- **FR-046**: The game MUST include a short explanation of the goal and the controls, reachable at
  any time from within the game.

### Non-Functional Requirements

Accessibility

- **FR-047**: The full game MUST be playable using only a keyboard, including every control, every
  dialog, and every setting.
- **FR-048**: Keyboard focus MUST always be visibly indicated, MUST move into a dialog when the
  dialog opens, and MUST return to the control that opened it when the dialog closes.
- **FR-049**: Text and tile values MUST meet a minimum contrast ratio of 4.5:1, and non-text
  interface elements MUST meet a minimum ratio of 3:1.
- **FR-050**: Tile values MUST always be presented as numbers. Colour MUST NOT be the only way to
  tell two tiles apart.
- **FR-051**: Score changes, the win message, and the game-over message MUST be announced to
  screen readers.
- **FR-052**: The board MUST expose its contents to assistive technology so that each cell reads
  its tile value or "empty".
- **FR-053**: Interactive controls MUST offer a touch target of at least 24 by 24 CSS pixels.
- **FR-054**: The game MUST remain fully usable when text is enlarged to 200%, with no loss of
  content or function.
- **FR-055**: The game MUST meet WCAG 2.2 Level AA for every must-have requirement in this
  specification.

Performance and delivery

- **FR-056**: Animations MUST hold 60 frames per second on current mid-range phones.
- **FR-057**: The first load of the game MUST complete within 2 seconds on a fast 4G connection.
- **FR-058**: The total transfer size of all assets MUST stay under 300 KB, excluding optional
  sound files.
- **FR-059**: Standard web quality assessments for performance, accessibility, best practices, and
  search visibility MUST each score 90 or higher.
- **FR-060**: The game MUST be installable on a phone home screen and on a desktop application
  list, and MUST run fully offline once installed.
- **FR-061**: A newly published version of the game MUST become available to returning players
  without breaking a game that is in progress.

Privacy and independence

- **FR-062**: The game MUST NOT collect, transmit, or store personal data, MUST NOT set cookies,
  and MUST load no content from any origin other than the one that serves the game.
- **FR-063**: The game MUST be fully playable without an account, without a server, and without a
  network connection.

Robustness and presentation

- **FR-064**: Input received while an animation is still running MUST be handled consistently, so
  that rapid play never leaves the board in an impossible state.
- **FR-065**: The layout MUST remain usable from a viewport 320 pixels wide up to a large desktop
  monitor, and MUST NOT require horizontal scrolling at any supported size.
- **FR-066**: The board MUST scale to fit the available space and MUST stay square in both
  portrait and landscape orientation.
- **FR-067**: The game MUST be delivered over a secure connection, so that installing it and
  playing it offline are both supported.

### Key Entities *(include if feature involves data)*

- **Tile**: A square on the board holding a single value. Attributes: the value shown (always a
  power of two, from 2 upward), the cell it occupies, and whether it arrived by sliding, by
  merging, or by being newly placed.
- **Cell**: One of the 16 positions on the grid. Attributes: the tile it holds, if any, and its
  row and column.
- **Game**: The state of one round of play. Attributes: the grid of cells, the current score, the
  best score, the number of moves made, whether the 1024 tile has been reached, whether play has
  continued past 1024, and whether the game has ended.
- **Undo snapshot**: A single retained copy of the grid, current score, and best score as they
  stood immediately before the most recent valid move.
- **Settings**: The player's stored preferences. Attributes: the chosen theme, whether sound is
  enabled, and whether the game has ever been opened before.
- **Stored game**: The copy of the current game held on the player's device so play can be resumed
  after the page is closed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time player makes a legal move within 10 seconds of the game appearing,
  without needing to read instructions first.
- **SC-002**: A player using only the arrow keys can complete 50 consecutive legal moves in under
  three minutes with no incorrect board state at any point.
- **SC-003**: Every rule listed in the Functional Requirements section is covered by an automated
  check that passes on every release build, and the full check suite passes before any release.
- **SC-004**: An automated accessibility scan reports zero violations, and a manual pass with both
  a screen reader and a keyboard-only session completes a full game from start to game over.
- **SC-005**: The first load completes in under 2 seconds on a fast 4G connection, measured on the
  release build.
- **SC-006**: The installed game opens and a full game is completed with the device in airplane
  mode.
- **SC-007**: The game is fully usable from a 320 pixel-wide phone screen up to a large desktop
  monitor, in both portrait and landscape, with no horizontal scrolling at any supported size.
- **SC-008**: The total transfer size of all assets stays under 300 KB, excluding optional sound
  files.
- **SC-009**: Slide and merge animations complete within 150 milliseconds on current mid-range
  phones while holding 60 frames per second.
- **SC-010**: A player who leaves mid-game and returns within 24 hours finds the board, the current
  score, the best score, and the undo availability exactly as they left them.
- **SC-011**: The game is verified manually in the latest two stable versions of Chrome, Edge,
  Firefox, and Safari on desktop, Safari on iOS and iPadOS, and Chrome on Android, with at least
  one real phone tested for each mobile platform.
- **SC-012**: In a moderated 10-minute play session, at least 4 of 5 testers describe the game as
  polished, responsive, and worth returning to, and all 5 complete at least one move without
  instruction.
- **SC-013**: When the same game is open in two tabs, the tab that did not save last shows a notice
  within one second of the other tab's save, and the board it displays afterwards matches the most
  recent save.

## Assumptions

- The authoritative feature description for this specification is `1024-game-BRD.md`, because the
  command was invoked without inline arguments. Where this specification and the BRD disagree,
  the BRD wins and this document must be corrected.
- Players use a current browser with the scripting capability required by a browser game, and the
  game's own asset budget keeps the game within reach of low-end mobile devices.
- The game is delivered as static files to any static host. It has no server-side component, and
  all state lives on the player's device.
- Storage on the player's device is available in the normal case. When it is blocked, the game
  still plays for the current session without persistence, and without error messages that would
  interrupt play.
- This is a single-person project: the same person acts as product owner and developer, and
  sign-off happens through the specified review gates rather than a separate approval board.
- The game collects no telemetry, so player-behavior success criteria are verified in moderated
  manual sessions rather than from tracked data.
- The scope of this feature is the first release described in the BRD. Items the BRD lists as out
  of scope, including accounts, cloud synchronisation, leaderboards, selectable board sizes,
  mouse-drag and WASD controls, multi-level undo, monetisation, analytics, multiplayer, and native
  store distribution, remain out of scope.
- Product owner and approver names are recorded in the BRD, not in this specification, because
  they do not affect any requirement here.
- The BRD's code-quality requirements, covering separation of game logic from presentation,
  automated unit tests for that logic, and readable documented source, are engineering constraints
  rather than product requirements. They are governed by the ratified project constitution and are
  expected to be carried into the technical plan, not restated here. The automated-test obligation
  is additionally visible to users of this specification through SC-003.
