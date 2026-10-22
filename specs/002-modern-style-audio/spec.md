# Feature Specification: Modern Style, Smoother Motion, and Sound Fixes

**Feature Branch**: `002-modern-style-audio`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "I would like to add a more modern style with smoother moves and fix the audio issues. The look and feel should feel modern and a more stylish color palette. I'm open to suggestions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Moves that feel smooth and alive (Priority: P1)

As a player, I want tiles to glide, merge, and appear with fluid, natural motion, so that playing
feels responsive and polished instead of stepped or abrupt.

**Why this priority**: Motion is what the player touches on every move. It is the largest single
contributor to how modern the game feels, and it can be delivered and judged without the visual
redesign or the sound work.

**Independent Test**: Play a full game on a current mid-range phone and a desktop browser, once
with normal motion and once with the operating system's reduced-motion setting on. Tiles must
travel continuously, merges must read as a deliberate event, new tiles must arrive without
popping, and a burst of rapid input must never stutter or leave the board in a wrong state.

**Acceptance Scenarios**:

1. **Given** a board with several tiles, **When** the player slides in any direction, **Then** every
   tile travels to its destination in one continuous, eased motion with no visible stepping, and
   tiles that merge arrive together as one.
2. **Given** two tiles merge, **When** the merge completes, **Then** the merged tile gives a brief,
   clearly visible acknowledgement (for example, a short emphasis) that is distinct from an
   ordinary slide.
3. **Given** a move places a new tile, **When** the tile appears, **Then** it arrives with a short
   entrance rather than appearing instantly, and it never obscures a tile that is still moving.
4. **Given** the player presses keys or swipes faster than the animation finishes, **When** input
   arrives mid-motion, **Then** the motion stays smooth, no move is lost or doubled, and the final
   board is exactly the one the rules produce.
5. **Given** the operating system's reduced-motion preference is on, **When** the player moves,
   **Then** sliding, merging, and appearing motion is removed or reduced to a simple fade, as before.
6. **Given** a player undoes a move or starts a new game, **When** the board changes, **Then** the
   change is animated smoothly, not by an abrupt redraw.

---

### User Story 2 - Sound effects that work and sound good (Priority: P1)

As a player who turns sound on, I want each event to have its own pleasant, well-balanced sound
that plays reliably, so that sound adds to the game instead of getting in the way.

**Why this priority**: Sound is currently broken: the player reports that no audio comes out. The
shipped effects are also all the same very short, quiet sound (move, merge, win, and game over are
identical). Fixing it is a defect fix against an existing requirement, so it ranks with the motion
work.

**Independent Test**: Turn sound on, on a desktop browser and on a phone, play until a move, a merge,
the win, and a game over have each happened, and listen. Sound must actually come out, each event must
sound different from the others, none may click, distort, or cut off, and the volume must be
consistent and comfortable.

**Acceptance Scenarios**:

1. **Given** the player turns sound on, **When** the next move, merge, undo, win, or game over occurs,
   **Then** the player hears it at a normal device volume. A sound control that shows "on" while no
   sound can come out is a defect.
2. **Given** sound is on, **When** a plain move, a merge, an undo, the win, and a game over each occur,
   **Then** the player hears clearly different, soft and natural sounds for each event (a light tap for a
   move, a warm two-note chime for a merge, a soft reverse-tap for an undo, a rising flourish for the
   win, a soft falling tone for game over).
3. **Given** sound is on, **When** many merges happen in quick succession, **Then** the sounds do
   not stack into noise, distort, or startle, and the overall loudness stays comfortable.
4. **Given** sound is on, **When** any effect plays, **Then** it starts promptly after the event, with
   no audible delay behind the motion, and ends cleanly with no pop or click.
5. **Given** the player turns sound on for the first time on a phone, **When** they make their first
   move, **Then** sound plays without a second tap, and without needing to reload the game.
6. **Given** sound is on, **When** the player undoes a move, **Then** a subtle sound of its own plays
   (a soft reverse-tap), distinct from the move sound.
7. **Given** sound is off, **When** the player plays, **Then** nothing is heard and no audio data is
   downloaded, exactly as today.

---

### User Story 3 - A modern look and feel (Priority: P2)

As a player, I want the game to look current and stylish, so that it feels like a well-made modern
app rather than a plain prototype.

**Why this priority**: The visual redesign is the core of the request, but the game is fully usable
without it, so it follows the motion and sound fixes that repair or improve how the game behaves.

**Independent Test**: Open the redesigned game next to the current one with five testers. The
redesign must read as clearly more modern, every control must still be recognizable and usable, and
nothing may become harder to read.

**Acceptance Scenarios**:

1. **Given** the game is open, **When** the player looks at the screen, **Then** the board, tiles,
   scores, controls, and dialogs share one consistent modern visual language: rounded shapes,
   generous and even spacing, soft depth, and a clear type hierarchy.
2. **Given** the player uses a button, selector, or toggle, **When** they hover, press, or focus it,
   **Then** it responds with a clear, polished state change, and the keyboard focus indicator stays
   plainly visible.
3. **Given** the win or game-over dialog appears, **When** it opens and closes, **Then** it
   transitions in and out smoothly and matches the new look.
4. **Given** the player rotates the phone or resizes the window, **When** the layout changes,
   **Then** the new design stays well proportioned, with the board square and nothing clipped, from
   320 pixels wide upward.

---

### User Story 4 - A stylish colour palette in every theme (Priority: P2)

As a player, I want a more stylish, cohesive colour palette in whichever theme I choose, so that the
game is pleasant to look at without costing me readability.

**Why this priority**: Colour is part of the redesign but is also a safety matter here: the existing
themes carry contrast and colour-blind commitments that a restyle must not break.

**Independent Test**: Cycle through all four themes (light, dark, high-contrast, colour-blind-safe)
and the system default. Each must look intentionally designed, tile values must progress through a
recognizable colour sequence, and every contrast and distinguishability requirement already in force
must still pass.

**Acceptance Scenarios**:

1. **Given** any of the four themes, **When** the player views the board, **Then** the palette feels
   cohesive and deliberate, with tile colours that progress smoothly from low to high values and a
   distinct, eye-catching treatment for tiles above 1024.
2. **Given** any theme, **When** text, controls, and tile values are measured, **Then** they still
   meet the existing contrast minimums (4.5:1 for text, 3:1 for interface elements), and the
   high-contrast theme still meets 7:1 for text.
3. **Given** the colour-blind-safe theme, **When** tile values are viewed under a red-green colour
   vision simulation, **Then** they remain distinguishable, and tile values are still always shown
   as numbers.
4. **Given** a player who already chose a theme, **When** they return after the update, **Then**
   their choice is kept and shown in the new palette.
5. **Given** the player has not chosen a theme, **When** the game opens, **Then** it still follows the
   device's light or dark setting.

---

### Edge Cases

- Rapid or repeated input while a move is still animating: the result is the same as if each move had
  finished first, and the motion never glitches or freezes.
- A low-powered phone cannot keep up: motion degrades gracefully (shorter or simpler) rather than
  stuttering, and the game stays correct and playable.
- The reduced-motion preference is on: all new motion, including merge emphasis, dialog transitions,
  and hover or press effects, is removed or reduced to a fade.
- The device blocks sound until the player interacts: the game stays fully playable, and sound begins
  as soon as it is allowed, with no error shown.
- The game is reloaded with sound saved as on: the control shows "off" until the player's first tap or key
  press, then turns "on" by itself and the sound plays. If that first gesture cannot start sound, the
  control stays "off" and the saved choice is kept for the next gesture.
- The device is silenced by its own hardware switch or system volume: nothing can be heard, and the game
  cannot override that. Play is unaffected.
- The sound cannot be prepared or the device has no audio output: the sound control stays off, nothing
  alarming is shown, and play is unaffected.
- Sound is enabled while offline: it works exactly as when online, because the sounds are made in the game
  itself and nothing is fetched.
- Text is enlarged to 200%, or the screen is 320 pixels wide: the new design loses no content or
  function and does not scroll sideways.
- A stored game, best score, theme, and sound setting from before the update: all are preserved and
  work unchanged after it.
- A very large tile value (2048 or higher): it remains readable and distinguishable in every theme.
- The player has a returning cached copy of the old design: the update reaches them without breaking
  a game in progress, as the existing update rule already requires.

## Clarifications

### Session 2026-10-22

- Q: Should slide and merge animations stay under the existing 150-millisecond limit, or may "smoother"
  motion run longer? → A: Keep the 150 ms limit; smoothness comes from easing, continuity, and the merge
  acknowledgement, and nothing in feature 001 changes
- Q: Which overall style should the new look aim for: calm and soft, bold and vibrant, or dark with glowing
  accents? → A: Calm and soft
- Q: What character should the new sound effects have: soft and natural, playful and game-like, or
  minimal and quiet? → A: Soft and natural
- Q: Should undoing a move make its own subtle sound, or should undo be silent? → A: Its own subtle
  sound, which makes five effects in all
- Q: When a player reloads the game with sound saved as on, what should the sound control show before they
  touch anything? → A: Off; the saved choice stays on, and the control switches to on and the sound starts
  at the player's first tap or key press
- Q: Should the undo and new-game transitions also finish within 150 milliseconds, like slides and merges?
  → A: Yes; every board change finishes within 150 ms
- Q: When a key is pressed while a move is still animating, should that move wait for the current animation
  or should the current one jump to its end? → A: Wait; the new move starts as soon as the current animation
  ends, and every motion plays completely

## Requirements *(mandatory)*

### Functional Requirements

Motion

- **FR-001**: Tiles MUST move from their old cell to their new cell in one continuous, eased motion,
  with no visible stepping or jumping.
- **FR-002**: Tiles that merge MUST arrive together, and the merged tile MUST show a brief, clearly
  visible acknowledgement that is distinct from an ordinary slide.
- **FR-003**: A newly placed tile MUST appear with a short entrance, and MUST NOT cover a tile that is
  still moving.
- **FR-004**: Undo and starting a new game MUST change the board with an animated transition rather
  than an abrupt redraw.
- **FR-005**: Every board change, meaning a slide, a merge and its acknowledgement, a new tile's entrance,
  an undo, and a new game, MUST complete within the 150 millisecond limit already in force (feature 001,
  FR-036), and MUST hold 60 frames per second on current mid-range phones. Smoothness MUST come from easing and continuity, not from lengthening the
  animation, and the limit MUST NOT be changed by this feature.
- **FR-006**: Input that arrives while a move is animating MUST be queued and applied in order. The queue
  holds at most 2 pending moves; a key press or swipe made while it is full is ignored, and a held key's
  repeat events are not queued. Each accepted move MUST start as soon as the move before it ends, so a move
  queued behind one animation starts within 150 milliseconds of the key press. Every motion MUST play out
  completely rather than being cut short. The final board MUST be exactly the one the rules produce for the
  moves that were accepted, with none lost or applied twice.
- **FR-007**: When the operating system's reduced-motion preference is on, every motion this feature
  adds MUST be removed or reduced to a simple fade, and the game MUST stay fully playable.

Sound

- **FR-008**: The move, merge, undo, win, and game-over effects MUST be five clearly different sounds,
  each fitting its event and each long enough to be recognised as a cue rather than a click. They MUST
  have a soft, natural character matching the calm look: a light tap for a move, a warm two-note chime
  for a merge, a soft reverse-tap for an undo, a rising flourish for the win, and a soft falling tone
  for game over.
- **FR-009**: Every effect MUST start promptly after its event with no audible delay behind the motion,
  and MUST end cleanly with no pop, click, or distortion.
- **FR-010**: Sound loudness MUST be consistent across the five effects and comfortable at a normal
  device volume, and a rapid run of merges MUST NOT stack into distortion or noise.
- **FR-011**: When a player turns sound on, sound MUST work from the next event without a reload or a
  second tap, on phones as well as desktop.
- **FR-012**: Undo MUST play its own subtle sound when sound is on, including an undo from the
  game-over state, and MUST NOT reuse the move sound.
- **FR-013**: The sound rules already in force MUST continue to hold: sound is off by default, any sound
  data is fetched or prepared only when the player first turns sound on, nothing is downloaded by a
  player who never does, and the sound stays within its 100 KB size budget.
- **FR-014**: When sound is on, the player MUST be able to hear each effect at a normal device volume on
  every supported desktop and phone browser. The sound control MUST NOT show "on" unless the sound is
  ready to play, and if it cannot be made ready it MUST show "off" instead. After a reload with sound
  saved as on, the control MUST show "off" until the player's first tap or key press, then switch to "on"
  and play, without the player having to turn sound on again; the saved choice MUST NOT be lost.

Look and feel

- **FR-015**: The board, tiles, scores, controls, and dialogs MUST share one consistent modern visual
  language with a calm, soft character, covering rounded shapes, even spacing, soft depth, a muted
  background that lets the tiles stand out, and a clear type hierarchy.
- **FR-016**: Buttons, selectors, and toggles MUST show a clear, polished change on hover, press, and
  keyboard focus, and the focus indicator MUST remain plainly visible in every theme.
- **FR-017**: The win, game-over, and confirmation dialogs MUST open and close with a smooth
  transition and match the new look.
- **FR-018**: The layout MUST stay well proportioned and usable from 320 pixels wide up to a large
  desktop monitor, in portrait and landscape, with the board square and no sideways scrolling, and MUST
  survive text enlarged to 200% without losing content or function.
- **FR-019**: The new design MUST NOT make any element harder to find or use than it is today. Every
  control that exists today MUST remain, and each MUST keep a touch target of at least 24 by 24 CSS
  pixels.

Colour

- **FR-020**: All four themes (light, dark, high-contrast, and colour-blind-safe) MUST be restyled with
  a cohesive, stylish palette in the calm, soft direction, with one confident accent colour used
  sparingly for the main action and focus, tile colours that progress smoothly from low to high values,
  and a distinct treatment for every value above 1024.
- **FR-021**: Every theme MUST keep meeting the contrast minimums already in force (4.5:1 for text and
  tile values, 3:1 for interface elements), and the high-contrast theme MUST keep meeting 7:1 for text
  and 4.5:1 for interface elements.
- **FR-022**: The colour-blind-safe theme MUST keep its tile values distinguishable under a red-green
  colour vision simulation, and tile values MUST always be shown as numbers, never by colour alone.
- **FR-023**: A theme the player already chose MUST be kept after the update, and a player who has not
  chosen one MUST still get the device's light or dark setting.

Continuity

- **FR-024**: Everything the game does today MUST keep working unchanged: the rules, scoring, undo, win
  and endless mode, game over, saving and resuming, installing and playing offline, the privacy
  rules, and every accessibility requirement. A saved game, best score, and settings from before the
  update MUST load and behave the same.
- **FR-025**: The shipped size budgets already in force MUST keep holding: all assets except sound
  under 300 KB, sound under 100 KB, and 400 KB combined. The new design MUST NOT add a third-party
  font, image, or script that is loaded from outside the game's own origin.

### Key Entities *(include if feature involves data)*

- **Theme**: One of the four shipped colour schemes, plus the follow-the-device default. Attributes: the
  page and surface colours, the text colours, the focus colour, and the colour pair for each tile value
  and for values above 1024. The player's choice is stored and kept across the update.
- **Sound effect**: One of the cues the game can play. Attributes: the event it belongs to (move, merge,
  win, game over, and undo), its length, and its loudness. Together the effects stay within the
  sound size budget.
- **Motion**: The animation that accompanies a board change. Attributes: the kind (slide, merge, appear,
  undo, new game), its duration, and whether it is reduced or removed under the reduced-motion preference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a moderated side-by-side session, at least 4 of 5 testers rate the redesigned game as
  more modern than the current one, and none rates it as harder to read or use.
- **SC-002**: In the same session, at least 4 of 5 testers describe the tile movement as smooth, and none
  reports stepping, flicker, or lag on a current mid-range phone.
- **SC-003**: Every board change (slide, merge, new tile, undo, new game) completes within 150
  milliseconds and holds 60 frames per second on a current mid-range phone, measured while a burst of at
  least 10 rapid moves is applied.
- **SC-004**: After a burst of at least 50 rapid moves, the board and score are identical to those produced
  by applying the same moves one at a time, in every run.
- **SC-005**: With sound on, a listener can tell the move, merge, undo, win, and game-over effects apart
  in every blind trial, and no two of the five effects are identical.
- **SC-006**: With sound on, no effect clips, pops, or distorts. As the game plays them, each effect peaks
  between 12 and 3 decibels below full scale, and the loudest and quietest of the five differ by no more
  than 3 decibels.
- **SC-007**: On every supported desktop and phone browser, a player who turns sound on hears each of the
  five effects from the next event, with no reload and no second tap, in every trial. No trial ends with
  the control showing "on" and nothing audible.
- **SC-008**: All four themes pass the contrast checks already in force, the high-contrast theme reaches at
  least 7:1 for text, and the colour-blind-safe theme's tile values stay distinguishable under a red-green
  colour vision simulation.
- **SC-009**: An automated accessibility scan reports zero violations in every theme, and the existing
  keyboard and screen-reader pass still completes a full game.
- **SC-010**: The total size of all assets except sound stays under 300 KB, the sound stays under 100 KB,
  and a player who never turns sound on downloads no audio at all.
- **SC-011**: The full automated test suite that passes today still passes, and a game saved before the
  update resumes with the same board, scores, and settings.
- **SC-012**: The game remains fully usable from a 320 pixel-wide phone up to a large desktop monitor, in
  both orientations, with no sideways scrolling.

## Assumptions

- This feature is a refresh of the existing 1024 game (feature 001). It changes how the game looks, moves,
  and sounds, and fixes the sound effects. It adds no new gameplay, no new controls, no new settings, and
  no new themes beyond restyling the four that exist.
- The feature does not touch the constitution's out-of-scope list (accounts, leaderboards, board sizes,
  other controls, multi-level undo, monetization, analytics, multiplayer, store distribution), so no
  constitution amendment is expected. The constitution's own limits (vanilla web stack, no third-party
  runtime content, accessibility, size and speed budgets, privacy) apply unchanged.
- "Smoother" means more fluid and polished within the 150 millisecond limit that already exists, not
  slower. This was confirmed in clarification: feature 001's limit stays as it is.
- The player reports that no audio comes out, without saying on which device or browser, so the fix is
  specified for every supported one. What the shipped files show: the four effects are byte-identical,
  each lasts only 0.1 second, and each peaks at about 18 decibels below full scale before the game turns
  them down by a further 10 decibels or so. The effects are therefore both identical and very quiet. The
  cause of complete silence, whether the files, the way the game starts playback, or a particular
  browser's rules for starting sound, is a finding for the planning stage, not a decision made here.
- A phone's hardware silent switch or system volume can mute any web page. The game cannot override it,
  so it is not treated as a defect.
- The player asked to be shown suggestions for the style, and chose the calm and soft direction in
  clarification: soft rounded surfaces with gentle depth; a calm, slightly desaturated background so the
  tiles stand out; one confident accent colour used sparingly for the primary action and focus; tile
  colours that move along a single, smooth hue progression from cool and light at low values to warm and
  rich at high values, with a distinct treatment above 1024; and generous spacing with a clear, modern
  type scale. The high-contrast theme keeps its stark character, applying the same shapes and spacing. The
  detailed palette is a design decision for the planning stage and is checked against the contrast rules.
- Fonts come from the player's own device, with no web font downloaded, to keep the size and privacy rules.
- The sound effects are generated by the game itself, so nothing is downloaded and no audio file format is
  involved.
- The same supported browsers, devices, and offline and install behaviour as feature 001 apply.
- This is a single-person project, so sign-off happens through the existing review gates and the manual
  moderated sessions, as in feature 001.
