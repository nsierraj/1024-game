# Contract: Motion

**Feature**: 002-modern-style-audio | **Date**: 2026-10-22 | **Plan**: [plan.md](../plan.md)

How a board change looks. The renderer decides what happened to each tile; the stylesheet owns the motion;
`animations.js` starts it and reports when it is over.

## Timeline of one move

All times are milliseconds from the start of the move. Nothing ends after 150 (FR-005).

```text
0        60   70            100                150
|--------|----|--------------|------------------|
 slide ============================|
                merge emphasis   =================|
                  spawn entrance   ===============|
```

| Part | Start | End | Property | Curve |
|---|---|---|---|---|
| Slide | 0 | 100 | `transform` | `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out-quart) |
| Merge emphasis | 60 | 150 | `transform: scale` 1 -> 1.12 -> 1 | `cubic-bezier(0.34, 1.4, 0.64, 1)` |
| Spawn entrance | 70 | 150 | `transform: scale` 0.6 -> 1, `opacity` 0 -> 1 | `cubic-bezier(0.25, 1, 0.5, 1)` |
| Absorbed tile | 0 | 100 | slides with the merge, hidden when the slide ends | |

Only `transform` and `opacity` animate. The merge emphasis starts before the slide ends, so the merged tile
is acknowledged as it arrives.

## Custom properties

The stylesheet defines the timeline as custom properties so a test can read them:

`--slide-duration: 100ms`, `--merge-delay: 60ms`, `--merge-duration: 90ms`, `--spawn-delay: 70ms`,
`--spawn-duration: 80ms`, `--fade-duration: 80ms`, `--newgame-duration: 150ms`.

The rule checked by `tests/unit/motion.test.js`: for the slide, merge, and spawn,
`delay + duration <= 150ms`.

## Completion

A move is over when the last of its animations fires `animationend` or `transitionend`, or after 160 ms,
whichever is first. Input that arrived during the move is queued and applied in order afterwards. The queue holds at most 2
pending moves; presses made while it is full are ignored and a held key's repeat events are not queued
(FR-006).
The result is identical to applying the moves one at a time (SC-004).

## Other board changes

| Change | Behaviour |
|---|---|
| Undo | Surviving tiles slide to their restored cells; tiles that no longer exist fade out (80 ms); restored tiles enter with the spawn entrance. |
| New game | The tile layer cross-fades over 150 ms. |
| Reload with a saved game | No animation; the board is drawn in place. |

## Dialogs

| Part | Duration | Notes |
|---|---|---|
| Enter | 160 ms | Opacity 0 -> 1 and a 6 px rise, on the dialog and its backdrop. |
| Leave | 120 ms | `data-closing` plays the reverse, then `close()` runs. With reduced motion `close()` runs at once. |

Dialog motion is not a board change, so it is outside the 150 ms rule for slides and merges.

## Controls

Buttons, the selector, and the toggle change background, shadow, and `transform: translateY(-1px)` on hover,
press down on `:active`, and keep a 3 px focus ring on `:focus-visible`. Each change takes 120 ms.

## Reduced motion

Under `prefers-reduced-motion: reduce`:
- Slide, merge, spawn, undo, and new-game motion become an immediate change (spawn and new game may fade for
  at most 100 ms).
- Dialog enter and leave, and control hover and press movement, are removed. Colour changes stay, with no
  transition.
- The rule is one block in the stylesheet that sets every duration to 0 and every animation to none.
