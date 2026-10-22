# Data Model: 1024 Browser Game

**Feature**: 001-1024-browser-game | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

Entities are derived from the Key Entities section of the specification (spec.md lines 439-455) and
from the requirements they must satisfy. Every entity that the player never sees directly is
specified here anyway, because the logic core, the storage layer, and the test suite all have to
agree on these shapes.

All data lives in memory as plain JavaScript values. There is no database, no server, and no
schema migration framework. The only persisted shapes are the two envelopes in
[contracts/storage-schema.md](contracts/storage-schema.md).

---

## 1. Tile

A single occupied square on the board.

| Field | Type | Rules |
|---|---|---|
| `value` | `number` | Always a power of two, `2 <= value`, `value <= 4096` in practice. 2, 4, 8, ..., 1024 are reachable by rule. Values above 1024 continue to grow (FR-024) and are capped only by the 4x4 board's 16 slots. |
| `cell` | `Cell` | The cell the tile occupies. |
| `origin` | `"slide" \| "merge" \| "spawn"` | How the tile arrived in its current position. Used by the animation layer only; never by the rules. |

**Validation rules**

- `value` MUST be an integer, a power of two, and `>= 2`. A value of `0` is the sentinel for an
  empty cell and MUST NOT appear in a Tile.
- `value` MUST NOT be `1`.
- The same `value` MAY appear in several tiles; tiles are distinguished by position, not value.

## 2. Cell

One of the 16 positions on the grid.

| Field | Type | Rules |
|---|---|---|
| `row` | `number` | `0..3`. |
| `col` | `number` | `0..3`. |
| `tile` | `Tile \| null` | `null` means empty. |

**Validation rules**

- Exactly 16 cells exist (FR-001). The grid is always 4 rows by 4 columns.
- `(row, col)` MUST be unique across cells; a cell's position is its identity.
- A cell MUST hold at most one tile.

**Representation note**: the logic core does **not** use Cell objects. It uses a flat array of 16
numbers, where `0` means empty and the index encodes the position (`index = row * 4 + col`). This
keeps the core cheap to copy for undo and trivial to serialize. The Cell/Tile pair above is the
*presentation-facing* model that [contracts/ui-contract.md](contracts/ui-contract.md) maps onto the
DOM. The two representations are converted at exactly one boundary, in `src/ui/render.js`.

## 3. Game

The state of one round of play.

| Field | Type | Rules |
|---|---|---|
| `board` | `number[16]` | 16 entries, each `0` or a power of two `>= 2`. |
| `score` | `number` | Integer `>= 0`. Increases only by merge values (FR-014). |
| `bestScore` | `number` | Integer `>= 0`, `bestScore >= score` at all times (FR-016, FR-017). |
| `moves` | `number` | Integer `>= 0`. Counts applied valid moves. |
| `hasWon` | `boolean` | `true` once a 1024 tile has been created (FR-019). Stays `true` for the rest of the game. |
| `endless` | `boolean` | `true` once the player chose "keep playing" after the win (FR-021). |
| `status` | `"active" \| "won" \| "gameover"` | `won` is the transient state between creating the 1024 tile and the player answering the win dialog. `gameover` is terminal until a new game or an undo. |
| `undo` | `UndoSnapshot \| null` | The single retained pre-move snapshot (FR-025). |
| `seed` | `number` | Unsigned 32-bit integer. Seeds the PRNG so a run is reproducible. |

**Validation rules**

- `score` MUST be the exact sum of all merge values awarded so far (FR-014).
- `bestScore` MUST be the maximum of every `score` reached in this game *and* in any previous game
  on this device (FR-016). It MUST NEVER decrease, including across an undo (FR-026) and across a
  reload (FR-032).
- `hasWon` MUST be `true` if and only if the board contains a tile of value `1024` or greater.
  A tile above 1024 can only exist after the win was seen, so the invariant holds in both
  directions.
- `endless` MUST be `false` while `status` is `"active"`.
- `status` MUST be `"gameover"` if and only if the board is full **and** no two orthogonally
  adjacent tiles share a value (FR-022).
- `undo` MUST be `null` when `moves` is `0` (FR-027).

## 4. Undo snapshot

One retained copy of the state immediately before the most recent valid move.

| Field | Type | Rules |
|---|---|---|
| `board` | `number[16]` | Board before the move. |
| `score` | `number` | Score before the move. |
| `bestScore` | `number` | Best score before the move. |
| `moves` | `number` | Move count before the move. |
| `hasWon` | `boolean` | Whether a 1024 tile had been created before the move. |
| `endless` | `boolean` | Whether the player had chosen to keep playing before the move. |
| `status` | `string` | The status before the move. |

**Validation rules**

- There is at most one snapshot at a time (FR-025, single-level undo).
- The snapshot MUST be replaced, not stacked, on every valid move (FR-025: "the single most
  recent").
- An invalid move MUST NOT replace the snapshot (FR-005: a rejected move changes nothing).
- Restoring a snapshot MUST restore `bestScore` to the snapshot's value, even when that lowers it
  (FR-026). A best score raised by an undone move does not survive the undo.
- Restoring a snapshot MUST also restore `hasWon`, `endless`, and `status`, so undoing the move
  that created the first 1024 tile rewinds the win and any keep-playing choice, and the win is
  raised again when 1024 is next created (FR-019).

## 5. Settings

The player's stored preferences.

| Field | Type | Rules |
|---|---|---|
| `theme` | `"system" \| "light" \| "dark" \| "contrast" \| "colorblind"` | `"system"` means follow the operating system preference (FR-042). The other four are the shipped themes (FR-041, FR-044). |
| `sound` | `boolean` | `false` by default (FR-039). |
| `visited` | `boolean` | `true` once the game has been opened before. Drives the first-visit help (FR-046). |

**Validation rules**

- `theme` MUST be one of the five values above. An unrecognized value is treated as `"system"`.
- `sound` MUST default to `false` when the settings record is missing or unreadable (FR-039).
- `visited` MUST default to `false` when the settings record is missing.

## 6. Move result

The value returned by the logic core for one attempted move. Not persisted.

| Field | Type | Rules |
|---|---|---|
| `changed` | `boolean` | `false` when the board did not change (FR-005). |
| `board` | `number[16]` | The board after the move. |
| `score` | `number` | The score after the move. |
| `bestScore` | `number` | The best score after the move. |
| `moves` | `number` | The move count after the move. |
| `gained` | `number` | Points awarded by this move, `0` when nothing merged (FR-014, FR-018). |
| `merged` | `number[]` | Values of the tiles that merged, in merge order. Drives the merge animation. |
| `transitions` | `{ from: number, to: number, value: number }[]` | One entry per occupied cell of the resulting board, giving where each tile came from and where it landed. Drives the slide animation. |
| `spawned` | `{ index: number, value: number } \| null` | The tile placed after the move (FR-004), `null` when the move was rejected. |
| `status` | `"active" \| "won" \| "gameover"` | The status after the move. |
| `hasWon` | `boolean` | Whether this move created the first 1024 tile. |

**Validation rules**

- When `changed` is `false`, every other field MUST equal the input state and `spawned` MUST be
  `null` (FR-005).
- `gained` MUST equal the sum of the values of the tiles produced by merges (FR-014). Merging two
  8 tiles awards 16, because the merged tile's value is the sum.
- `transitions` MUST describe the same board the move produced: every occupied destination cell
  has exactly one entry, and the `value` of each entry equals the value at that cell after the
  move. A tile absorbed by a merge has no entry of its own.

## 7. Stored game and Stored settings

The persisted envelopes. Their exact JSON shapes, versioning rules, and failure behavior are in
[contracts/storage-schema.md](contracts/storage-schema.md). In memory they are plain objects with
the same fields as Game and Settings plus a `version` and a `savedAt`.

---

## State transitions

The Game moves through the following states. Every transition is caused by exactly one user
action, and the logic core is the only thing allowed to perform a transition (Principle II).

```text
                 start new game
                      |
                      v
                 [active] <------------------ undo -------------------+
                   |  ^                                                |
   create 1024     |  |  choose "keep playing"                         |
   (FR-019)        v  |                                                |
                 [won] -----------------------------------------------+
                   |
                   | choose "start a new game"
                   v
                 [new game -> active]

                 [active] -- board full, no adjacent equal tiles --> [gameover]
                   |                                                |
                   | undo (FR-028)                                   | new game (FR-029)
                   +------------------------------------------------+
```

### Transition table

| From | Trigger | To | Side effects |
|---|---|---|---|
| (none) | New game | `active` | Board gets exactly two tiles in random empty cells (FR-002), `score = 0`, `moves = 0`, `undo = null`, `hasWon = false`, `endless = false`. |
| `active` | Valid move | `active` | Score, moves, and board update; one new tile is placed (FR-004); the pre-move state is snapshotted for undo. |
| `active` | Invalid move | `active` | Nothing changes (FR-005). No tile is placed, no score change, the undo snapshot is not replaced. |
| `active` | Valid move that creates 1024 | `won` | `hasWon = true`, the win dialog opens (FR-019). |
| `won` | Player chooses "keep playing" | `active` | `endless = true`, `hasWon` stays `true`, no further win dialog appears (FR-021). |
| `won` | Player chooses "start a new game" | `active` | A fresh game begins, with confirmation if a game was in progress (FR-030). |
| `active` | Board full and no adjacent equal tiles | `gameover` | The game-over dialog opens with the final score (FR-022, FR-023). |
| `gameover` | Undo | `active` | The snapshot is restored, including its `status` (FR-028). |
| `won` or `active` after a win | Undo of the move that created the first 1024 tile | `active` | The snapshot is restored; `hasWon` and `endless` return to their pre-move values, so the win is raised again (FR-019). |
| `active` | Undo | `active` | The snapshot is restored; the snapshot is then cleared, because only one level of undo exists (FR-025). |
| any | New game | `active` | Confirmation is requested first if a game is in progress (FR-030). |

### Invariants that hold in every state

1. `board.length === 16`.
2. Every non-zero `board` entry is a power of two `>= 2`.
3. `bestScore >= score >= 0`.
4. `undo !== null` implies `moves > 0`.
5. `status === "won"` implies `hasWon === true` and the board contains a tile `>= 1024`.
6. `status === "gameover"` implies the board is full and no two orthogonally adjacent tiles are
   equal.
7. The number of occupied cells equals `2 + (number of valid moves)`, capped at 16. This is a
   direct consequence of FR-002 and FR-004 and is the cheapest invariant to assert in a test.

---

## Relationships

```text
Game 1 --- 1 UndoSnapshot (optional, at most one)
Game 1 --- * Cell (exactly 16)
Cell 1 --- 0..1 Tile
Tile  --- belongs to exactly one Cell
Game 1 --- 1 Stored game (persisted copy, best-effort)
Settings 1 --- 1 Stored settings (persisted copy, best-effort)
Stored game --- 1 Settings (only through bestScore continuity, not a hard link)
```

The last line is worth stating explicitly: `bestScore` survives across games because the stored
game carries the highest score ever reached, and the next game starts from that value. There is
no separate high-score record, and no server-side copy (FR-062, FR-063).
