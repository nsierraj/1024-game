# Contract: Storage Schema

**Feature**: 001-1024-browser-game | **Date**: 2026-10-21 | **Plan**: [plan.md](../plan.md)

The game persists exactly two things: the current game and the player's settings. Both live in
the browser's `localStorage` (D-10). There is no server, no account, and no cookie (FR-062,
FR-063).

## Keys

| Key | Contents | Written when |
|---|---|---|
| `1024:v1:game` | Stored game | After every valid move, after an undo, and when a new game starts |
| `1024:v1:settings` | Stored settings | When the player changes the theme or the sound toggle, and once on first visit |

The `:v1:` segment is the schema version. A future schema gets a new prefix rather than a
migration, so an old key is simply ignored and a new key is written beside it.

## Stored game

```jsonc
{
  "version": 1,
  "savedAt": 1761234567890,      // epoch milliseconds, for diagnostics only
  "board": [0, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8],
  "score": 24,
  "bestScore": 64,
  "moves": 7,
  "hasWon": false,
  "endless": false,
  "status": "active",
  "undo": {                     // or null when there is nothing to undo
    "board": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "score": 8,
    "bestScore": 64,
    "moves": 6
  }
}
```

### Field rules

| Field | Type | Rule |
|---|---|---|
| `version` | `number` | MUST be `1`. A record with a different version is discarded. |
| `savedAt` | `number` | Epoch milliseconds. Informational only. The game never reads it to decide anything. |
| `board` | `number[]` | MUST have exactly 16 entries. Each entry MUST be `0` or a power of two `>= 2`. |
| `score` | `number` | Integer `>= 0`. |
| `bestScore` | `number` | Integer `>= 0`, and MUST be `>= score`. |
| `moves` | `number` | Integer `>= 0`. |
| `hasWon` | `boolean` | `true` once a 1024 tile has been created. |
| `endless` | `boolean` | `true` once the player chose to keep playing after the win. |
| `status` | `string` | One of `"active"`, `"won"`, `"gameover"`. |
| `undo` | `object \| null` | MUST have the four fields of the undo snapshot, or be `null`. |

### Validation on read

A stored game is discarded, and a fresh game is started, when any of these is true:

1. The record is not valid JSON.
2. `version` is missing or is not `1`.
3. `board` is not an array of exactly 16 valid entries.
4. `score`, `bestScore`, or `moves` is not a non-negative integer.
5. `bestScore < score`.
6. `status` is not one of the three known values.
7. `undo` is present but malformed.

The game MUST NOT crash on a malformed record, and MUST NOT show a partially loaded board. A
discarded record is overwritten by the next save.

### Validation on write

The writer re-derives `score`, `bestScore`, `moves`, `hasWon`, and `status` from the in-memory
game rather than trusting a caller-supplied object. The only field written verbatim is `undo`,
which is already a snapshot produced by the logic core.

## Stored settings

```jsonc
{
  "version": 1,
  "theme": "system",       // "system" | "light" | "dark" | "contrast" | "colorblind"
  "sound": false,
  "visited": true
}
```

### Field rules

| Field | Type | Rule |
|---|---|---|
| `version` | `number` | MUST be `1`. A record with a different version is discarded and the defaults are used. |
| `theme` | `string` | One of the five values above. An unrecognized value falls back to `"system"`. |
| `sound` | `boolean` | MUST be `false` by default (FR-039). |
| `visited` | `boolean` | `true` once the game has been opened before. Drives the first-visit help (FR-046). |

### Defaults when the record is missing or invalid

```jsonc
{ "version": 1, "theme": "system", "sound": false, "visited": false }
```

`theme: "system"` means the game follows the operating system's light or dark preference until
the player overrides it (FR-042, FR-043). `sound: false` satisfies the default-off requirement
(FR-039).

## Failure behavior

Storage is best-effort. The game treats every stored value as a cache that may disappear (D-13).

| Failure | Behavior |
|---|---|
| `localStorage` is unavailable (private mode, disabled cookies, a locked-down browser) | The game runs entirely in memory. Nothing is written, nothing errors, no dialog appears. |
| `setItem` throws (quota exceeded) | The write is skipped silently. The in-memory game continues. The next save is attempted and may succeed if the board shrank. |
| `getItem` throws | Treated as "nothing saved". A fresh game starts. |
| The saved record is malformed | Treated as "nothing saved". A fresh game starts. |
| The stored value was evicted by the browser | Treated as "nothing saved". A fresh game starts. The player loses the in-progress game, which is the accepted consequence of a best-effort store. |

None of these failures may show an error message, a modal, or a console error that would alarm
the player. Losing a saved game is unfortunate; interrupting play to complain about it is worse.

## Cross-tab behavior

The game key is written on every save. A listener for the `storage` event watches that key
(D-11).

- The `storage` event fires in **other** same-origin tabs when the value changes, and does not
  fire in the tab that wrote it.
- When another tab's write is detected, the tab that did not write last shows a notice (FR-034).
  The most recent save wins; the other tab does not overwrite it.
- The notice is informational. It does not interrupt play and does not require a response.
- The event's `key` MUST be compared against `1024:v1:game` exactly, so that a settings change
  in another tab does not trigger the notice.

The notice text and its presentation are specified in
[ui-contract.md](ui-contract.md).

## Privacy

- No cookie is ever set (FR-062).
- No data is transmitted anywhere. The two keys never leave the device.
- No third-party script, font, image, or analytics endpoint is loaded (FR-062, FR-068).
- The `storage` event carries no payload beyond the fact that a write happened; it is never
  forwarded anywhere.
- The saved game contains no personal data: a board, three numbers, and two booleans.

## Size

The largest possible stored game is 16 board entries plus a 16-entry undo snapshot, each entry a
short number, plus a handful of scalars. That is well under 2 KB of JSON, which is why
`localStorage` is sufficient and IndexedDB is not (D-10).
