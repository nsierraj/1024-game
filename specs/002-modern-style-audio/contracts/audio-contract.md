# Contract: Audio

**Feature**: 002-modern-style-audio | **Date**: 2026-10-22 | **Plan**: [plan.md](../plan.md)

Replaces the audio section of feature 001's offline contract. The sound is made at runtime from recipes
(R-02). There are no audio files.

## Modules

| Module | Role | Pure? |
|---|---|---|
| `src/services/sound-synth.js` | The five recipes and `renderEffect(recipe, sampleRate)` | Yes: no DOM, no `AudioContext`, tested in Node |
| `src/services/audio.js` | `createAudio()`: owns the context, the state, unlocking, and playback | No: browser only |

## `renderEffect(recipe, sampleRate)`

Returns a `Float32Array` of mono samples. Deterministic: the same recipe and sample rate give the same
samples. The result is normalised so its largest absolute sample is the recipe's `peak` (-9 dBFS), with the
fade-in and fade-out applied.

## The five effects

| Id | Character | Notes (Hz) | Length |
|---|---|---|---|
| `move` | A light tap | 520 falling to 380, with an upper partial at 2.3x | 0.12 s |
| `merge` | A warm two-note chime | 659 then 880 at 70 ms, each with a 2x partial at 0.25 | 0.35 s |
| `undo` | A soft reverse-tap | 380 rising to 520 with a swelling envelope | 0.12 s |
| `win` | A rising flourish | 523, 659, 784, 1047 at 90 ms apart, each a chime | 0.80 s |
| `gameover` | A soft falling tone | 392, 330, 262 at 130 ms apart, sine with a slow decay | 0.70 s |

The notes are starting points for the implementation. The acceptance rules below decide whether a recipe is
good enough.

## Acceptance rules for every rendered effect

1. Peak between -12 and -3 dBFS; the five peaks within 3 dB of each other (SC-006).
2. Duration at least 0.08 s (a cue, not a click) and at most 1.2 s.
3. First and last samples within 0.001 of zero (no click).
4. No two effects have equal samples (SC-005).
5. RMS spread across the five at most 6 dB (so none sounds much louder than another).

## `createAudio()`

```js
/** @returns {{
 *   state: () => "off" | "arming" | "on" | "suspended",
 *   enable: () => boolean,          // call synchronously from a user gesture; true only if running
 *   disable: () => void,
 *   unlock: () => void,             // call synchronously from a gesture; re-resumes a suspended context
 *   play: (id: "move"|"merge"|"undo"|"win"|"gameover") => void
 * }} */
export function createAudio(options?: { contextFactory?: () => AudioContext });
```

- `enable()` and `unlock()` are synchronous and do not `await` before `resume()`. `enable()` returns whether
  the context is `running` immediately afterwards; a `resume()` that settles later is reflected in `state()`.
- The five buffers are rendered on the first `enable()` only, so a player who never turns sound on does no
  audio work and downloads nothing (FR-013).
- `play(id)` does nothing unless the state is `on`.
- Chain: buffer source -> gain 1.0 -> `DynamicsCompressor` -> destination. Voices are capped at 3, and a
  `merge` within 60 ms of the previous `merge` replaces it (R-04).
- `contextFactory` lets a test pass a fake context.

## Events that play a sound

`effectFor(event)` in `audio.js` is a pure function that returns the effect for an event, so the mapping
below can be tested without a browser. Undo, including an undo from the game-over dialog, never maps to
`move`.

| Event | Effect |
|---|---|
| A valid move with no merge | `move` |
| A valid move with at least one merge | `merge` |
| An undo (including from game over) | `undo` |
| The win dialog opens | `win` |
| The game-over dialog opens | `gameover` |

## When the control shows "on"

Only in the `on` state. If the player's own toggle fails to start sound, the control shows "off" and the
setting is saved as off. A saved "on" is restored at startup by creating the context and waiting for the
first gesture; the control shows "off" until that gesture resumes it, then turns "on" by itself. If that
first gesture cannot start sound, the control stays "off" and the saved "on" is kept for the next gesture
(data-model, section 3).

## Unlock gestures

`unlock()` is called from `click` on the sound control, and from the first `pointerup`, `touchend`, `keydown`,
and `click` anywhere on the page while sound is enabled and the state is `suspended`. It is also called from
`visibilitychange` when the page becomes visible.

## Offline and privacy

There is nothing to fetch, so sound works offline from the first enable. `sw.js` needs no audio rule.
The `assets/audio/` directory is removed. Nothing is stored beyond the existing `sound` setting.
