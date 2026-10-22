# Contract: Logic Core API

**Feature**: 001-1024-browser-game | **Date**: 2026-10-21 | **Plan**: [plan.md](../plan.md)

The logic core is the pure JavaScript module under `src/core/`. It owns every rule about how the
board behaves. It is the seam that Constitution Principle II is built around, and the contract
below is what makes that principle checkable rather than aspirational.

## Guarantees

1. **No DOM.** The module never touches `document`, `window`, `localStorage`, `navigator`, or any
   timer. It is importable in Node with no browser shim.
2. **No I/O.** Nothing is read or written. Persistence is the caller's job.
3. **Deterministic given its inputs.** The only source of non-determinism is the injected random
   function, so a seeded run always produces the same board.
4. **No mutation of its arguments.** Every function that changes state returns a new state object.
   The caller's previous state is never modified.
5. **Self-contained.** The module has no dependency outside `src/core/`.

## Module: `src/core/constants.js`

```js
export const BOARD_SIZE = 4;            // FR-001
export const CELL_COUNT = 16;           // BOARD_SIZE ** 2
export const TARGET_VALUE = 1024;       // FR-019
export const INITIAL_TILE_COUNT = 2;    // FR-002
export const SPAWN_VALUES = [2, 4];     // FR-003
export const SPAWN_WEIGHTS = [0.9, 0.1];
```

## Module: `src/core/random.js`

```js
/**
 * @param {number} seed - unsigned 32-bit integer
 * @returns {() => number} a function yielding floats in [0, 1)
 */
export function createRandom(seed: number): () => number;
```

- The generator is `mulberry32`. It is seeded, reproducible, and dependency-free (D-04).
- The returned function MUST yield values in `[0, 1)`.
- Two generators created with the same seed MUST produce the same sequence.

## Module: `src/core/board.js`

The board is a flat `number[16]` array. Index `i` maps to row `Math.floor(i / 4)` and column
`i % 4`. `0` means empty.

```js
/**
 * @param {number} [size]
 * @returns {number[]} a board of size * size, all cells empty
 */
export function createEmptyBoard(size?: number): number[];

/**
 * Slides and merges every row or column in one direction.
 * @param {number[]} board
 * @param {"up" | "down" | "left" | "right"} direction
 * @returns {SlideResult}
 */
export function slide(board: number[], direction: Direction): SlideResult;
```

**Slide rules** (FR-006, FR-007, FR-008, FR-009)

- Tiles compact toward the requested edge, preserving their relative order.
- Two adjacent tiles with equal values merge into one tile whose value is their sum. The merged
  tile is placed at the edge the tiles moved toward.
- A tile merges **at most once** per move. Sliding `2 2 2 2` left yields `4 4`, never `8 0`
  (FR-008).
- When three or more equal tiles are aligned, the two tiles **closest to the destination edge**
  merge (FR-009). Sliding `2 2 2` left yields `4 2`, not `2 4`.
- Merging is evaluated independently per row (for `left`/`right`) or per column (for
  `up`/`down`).
- `gained` is the sum of the values of the tiles produced by merges. Merging two 8 tiles yields
  `gained === 16` (FR-014).
- `merged` lists the source values of each merge, in the order the merges happened.
- `moved` is `false` when the board is unchanged by the slide.
- `transitions` lists one entry for every occupied cell of the resulting board, giving the source
  index the tile came from, the destination index it landed on, and its value after the slide. A
  source tile that was absorbed by a merge has no entry of its own, so the renderer recovers the
  absorbed tiles by taking the set difference between the occupied source cells and the `from`
  values. This is what lets the renderer animate a tile that both slides and merges in one move.

```js
/**
 * @param {number[]} board
 * @returns {boolean} true when at least one slide would change the board
 */
export function hasAvailableMoves(board: number[]): boolean;

/**
 * @param {number[]} board
 * @returns {boolean} true when no two orthogonally adjacent tiles share a value
 */
export function hasNoAdjacentEqual(board: number[]): boolean;
```

- `hasAvailableMoves` is `false` exactly when the board is full and no adjacent pair is equal
  (FR-022).
- Adjacency is orthogonal only. Diagonal neighbours do not count.

## Module: `src/core/game.js`

```js
/**
 * @param {{ random?: () => number, bestScore?: number }} [options]
 * @returns {Game}
 */
export function createGame(options?: CreateGameOptions): Game;
```

- The initial board contains exactly two tiles in random empty cells (FR-002).
- Each starting tile is `2` with probability `0.9` and `4` with probability `0.1` (FR-003).
- `options.random` defaults to a seeded `mulberry32`. `options.bestScore` seeds the best score
  carried over from a previous game (FR-016).

```js
/**
 * @param {Game} game
 * @param {"up" | "down" | "left" | "right"} direction
 * @returns {MoveResult}
 */
export function applyMove(game: Game, direction: Direction): MoveResult;
```

**Apply-move rules**

- If the slide does not change the board, the result has `changed === false`, the board is
  unchanged, no tile is placed, the score is unchanged, and the undo snapshot is **not** replaced
  (FR-005).
- If the slide changes the board, exactly one new tile is placed in a random empty cell (FR-004).
  When the board became full through the slide, no tile is placed.
- The new tile is `2` with probability `0.9` and `4` with probability `0.1` (FR-003).
- `score` increases by `gained` (FR-014). `bestScore` becomes `Math.max(bestScore, score)`
  (FR-017).
- The pre-move state (board, score, bestScore, moves) becomes the undo snapshot (FR-025).
- `moves` increments by 1.
- `transitions` carries the per-cell movement from the slide, so the renderer can animate a tile
  that both slides and merges.
- If the board now contains a tile `>= 1024` and `hasWon` was `false`, then `hasWon` becomes
  `true` and `status` becomes `"won"` (FR-019).
- If `status` was `"won"` and `endless` is `true`, the status returns to `"active"` and no further
  win is raised (FR-021).
- If the board is full and no adjacent pair is equal, `status` becomes `"gameover"` (FR-022).

```js
/**
 * @param {Game} game
 * @returns {Game} the restored state, or the original state when there is nothing to undo
 */
export function undo(game: Game): Game;
```

- Restores the board, the score, the move count, and the snapshot's best score, but
  `bestScore` is restored only when the snapshot's value is **higher** than the current value.
  The best score never decreases (FR-026).
- After a successful undo the snapshot is cleared, because only one level of undo exists
  (FR-025).
- The status is recomputed from the restored board: `"won"` if the restored board contains a tile
  `>= 1024`, `"gameover"` if the restored board is full with no adjacent equal pair, otherwise
  `"active"`.
- Undo is available from the game-over state (FR-028) and unavailable when there is no snapshot
  (FR-027).

```js
/**
 * @param {Game} game
 * @returns {boolean}
 */
export function canUndo(game: Game): boolean;
```

## Type definitions

The types below are JSDoc typedefs in `src/core/types.js`. They are documentation and editor
support, not compiled types (D-03).

```js
/**
 * @typedef {"up" | "down" | "left" | "right"} Direction
 *
 * @typedef {number[]} Board            16 entries, 0 means empty
 *
 * @typedef {{
 *   from: number,   // source index before the slide
 *   to: number,     // destination index after the slide
 *   value: number   // the tile's value after the slide, doubled when it merged
 * }} SlideTransition
 *
 * @typedef {{
 *   board: Board,
 *   gained: number,
 *   merged: number[],
 *   moved: boolean,
 *   transitions: SlideTransition[]
 * }} SlideResult
 *
 * @typedef {{
 *   board: Board,
 *   score: number,
 *   bestScore: number,
 *   moves: number,
 *   hasWon: boolean,
 *   endless: boolean,
 *   status: "active" | "won" | "gameover",
 *   undo: UndoSnapshot | null,
 *   seed: number
 * }} Game
 *
 * @typedef {{
 *   board: Board,
 *   score: number,
 *   bestScore: number,
 *   moves: number
 * }} UndoSnapshot
 *
 * @typedef {{
 *   changed: boolean,
 *   board: Board,
 *   score: number,
 *   bestScore: number,
 *   moves: number,
 *   gained: number,
 *   merged: number[],
 *   transitions: SlideTransition[],
 *   spawned: { index: number, value: number } | null,
 *   status: "active" | "won" | "gameover",
 *   hasWon: boolean
 * }} MoveResult
 */
```

## Boundaries the core must not cross

| The core MUST NOT | Because | Where that concern lives |
|---|---|---|
| Read or write `localStorage` | It is a pure function of its inputs | `src/services/persist.js` |
| Create DOM elements or query `document` | It must be testable in Node | `src/ui/render.js` |
| Play sound | Side effect outside the rules | `src/services/audio.js` |
| Persist state or schedule a save | The core does not know when saves happen | `src/main.js` |
| Measure time or use `Date.now()` | It would make results non-reproducible | the caller passes values in |
| Call `Math.random()` | The random source is injected | `src/core/random.js` |

## Rule-to-test traceability

SC-003 requires every rule in the Functional Requirements section to be covered by an automated
test. The test file that proves each rule is listed here so the mapping can be verified.

| Requirement | Rule | Test file |
|---|---|---|
| FR-001 | Board is 4x4 with 16 cells | `tests/unit/board.test.js` |
| FR-002 | New game starts with exactly two tiles | `tests/unit/game.test.js` |
| FR-003 | Spawn is 90% `2`, 10% `4` | `tests/unit/random.test.js` |
| FR-004 | Exactly one tile placed after a valid move | `tests/unit/game.test.js` |
| FR-005 | Invalid move changes nothing | `tests/unit/board.test.js`, `tests/unit/game.test.js` |
| FR-006 | All four directions slide every tile | `tests/unit/board.test.js` |
| FR-007 | Equal neighbours merge into one tile | `tests/unit/board.test.js` |
| FR-008 | A tile merges at most once per move | `tests/unit/board.test.js` |
| FR-009 | Closest-to-edge pair merges first | `tests/unit/board.test.js` |
| FR-014 | Score increases by the merged tile value | `tests/unit/game.test.js` |
| FR-016, FR-017 | Best score is retained and updates on a new record | `tests/unit/game.test.js` |
| FR-019 | First 1024 tile raises the win | `tests/unit/game.test.js` |
| FR-021 | No further win after choosing keep playing | `tests/unit/game.test.js` |
| FR-022 | Game over when full with no equal neighbours | `tests/unit/board.test.js`, `tests/unit/game.test.js` |
| FR-025 | Undo restores the single most recent move | `tests/unit/game.test.js` |
| FR-026 | Undo restores board, score, and best score | `tests/unit/game.test.js` |
| FR-027 | Undo unavailable at the start of a new game | `tests/unit/game.test.js` |
| FR-028 | Undo available from the game-over state | `tests/unit/game.test.js` |

The remaining requirements are not core rules. They belong to the UI, storage, audio, and offline
layers, and their verification is described in [quickstart.md](../quickstart.md).

The `transitions` list is a contract requirement in its own right rather than a functional
requirement, so it has no row in the table above. It is covered by `tests/unit/board.test.js`
alongside FR-006, because a transition list that does not agree with the board the slide produced
would be worse than no transition list at all.
