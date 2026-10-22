/**
 * Type definitions for the logic core.
 *
 * These are JSDoc typedefs, not runtime values. They exist so the shape of the data that crosses
 * module boundaries is written down in one place and checked by the editor, not scattered across
 * the functions that happen to use it. The definitions are the ones in
 * `contracts/logic-core-api.md`; the contract is the authority and this file is its transcription.
 */

/**
 * A direction the player can slide the tiles.
 * @typedef {"up" | "down" | "left" | "right"} Direction
 */

/**
 * The board. Sixteen entries counted row by row from the top left, so index `i` is row
 * `Math.floor(i / 4)` and column `i % 4`. Zero means the cell is empty.
 * @typedef {number[]} Board
 */

/**
 * One tile that moved during a slide.
 *
 * There is one entry for every occupied cell of the resulting board. A tile that was absorbed by
 * a merge has no entry of its own, so the renderer recovers the absorbed tiles by taking the set
 * difference between the occupied source cells and the `from` values.
 *
 * @typedef {object} SlideTransition
 * @property {number} from The source index before the slide.
 * @property {number} to The destination index after the slide.
 * @property {number} value The tile's value after the slide, doubled when it merged.
 */

/**
 * The result of sliding the board in one direction.
 * @typedef {object} SlideResult
 * @property {Board} board The board after the slide.
 * @property {number} gained The points the slide awarded.
 * @property {number[]} merged The source values of each merge, in the order the merges happened.
 * @property {boolean} moved Whether the slide changed the board.
 * @property {SlideTransition[]} transitions One entry for every occupied cell of the result.
 */

/**
 * The state a move can be undone to. Only one level of undo exists.
 * @typedef {object} UndoSnapshot
 * @property {Board} board
 * @property {number} score
 * @property {number} bestScore
 * @property {number} moves
 */

/**
 * The whole state of a game.
 * @typedef {object} Game
 * @property {Board} board
 * @property {number} score
 * @property {number} bestScore
 * @property {number} moves
 * @property {boolean} hasWon Whether the target tile has been reached at any point.
 * @property {boolean} endless Whether the player chose to keep playing after a win.
 * @property {"active" | "won" | "gameover"} status
 * @property {UndoSnapshot | null} undo The snapshot the next undo would restore, or null.
 * @property {number} seed The seed the game was created with.
 */

/**
 * The result of one player turn.
 * @typedef {object} MoveResult
 * @property {boolean} changed Whether the move changed the board.
 * @property {Board} board The board after the move.
 * @property {number} score The score after the move.
 * @property {number} bestScore The best score after the move.
 * @property {number} moves The move count after the move.
 * @property {number} gained The points the move awarded.
 * @property {number[]} merged The source values of each merge.
 * @property {SlideTransition[]} transitions The per-cell movement from the slide.
 * @property {{ index: number, value: number } | null} spawned The tile that was added, or null.
 * @property {"active" | "won" | "gameover"} status The status after the move.
 * @property {boolean} hasWon Whether the target tile has been reached.
 */

/**
 * The options a new game is created with.
 * @typedef {object} CreateGameOptions
 * @property {() => number} [random] The source of randomness. Defaults to a seeded generator.
 * @property {number} [bestScore] The best score carried over from a previous game.
 */

/**
 * A random number generator.
 *
 * The core never calls `Math.random`. Every source of randomness arrives as a function, so a test
 * can pin the sequence and replay the same game every time.
 *
 * @typedef {() => number} RandomSource
 */

export {};
