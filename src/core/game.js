/**
 * The game: the state of a 1024 game, the rules that change it, and the single level of undo.
 *
 * Every function here is pure. A move returns a new state and leaves the one it was given
 * untouched, and the only source of randomness is the generator the game carries, so a test can
 * replay the same game every time.
 */

import { createEmptyBoard, hasAvailableMoves, slide } from "./board.js";
import { INITIAL_TILE_COUNT, SPAWN_VALUES, SPAWN_WEIGHTS, TARGET_VALUE } from "./constants.js";
import { createRandom, pickWeighted } from "./random.js";

/**
 * The seed a game falls back to when the caller supplies neither a seed nor a generator.
 *
 * The core cannot reach for the clock or `Math.random`, so the default is fixed rather than
 * arbitrary. A caller that wants a different game passes a seed or a generator of its own.
 */
export const DEFAULT_SEED = 20261021;

/**
 * The indices of the empty cells of a board.
 * @param {number[]} board
 * @returns {number[]}
 */
function emptyIndices(board) {
  const indices = [];
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === 0) indices.push(index);
  }
  return indices;
}

/**
 * Picks one of the given indices at random.
 *
 * The index is clamped to the end of the list, so a generator that returns exactly 1 cannot send
 * the game off the end of the board.
 *
 * @param {number[]} indices
 * @param {() => number} random
 * @returns {number}
 */
function pickIndex(indices, random) {
  const position = Math.floor(random() * indices.length);
  return indices[Math.min(position, indices.length - 1)];
}

/**
 * The status a board implies, used when a state is restored rather than played forward.
 * @param {number[]} board
 * @returns {"active" | "won" | "gameover"}
 */
function statusFor(board) {
  if (board.some((value) => value >= TARGET_VALUE)) return "won";
  if (!hasAvailableMoves(board)) return "gameover";
  return "active";
}

/**
 * Starts a new game.
 *
 * The board begins with exactly two tiles in random empty cells, each of them a 2 with
 * probability 0.9 and a 4 with probability 0.1.
 *
 * @param {import("./types.js").CreateGameOptions} [options]
 * @returns {import("./types.js").Game} The new game.
 */
export function createGame(options = {}) {
  const seed = options.seed ?? DEFAULT_SEED;
  const random = options.random ?? createRandom(seed);
  const bestScore = options.bestScore ?? 0;

  const board = createEmptyBoard();
  for (let placed = 0; placed < INITIAL_TILE_COUNT; placed += 1) {
    const empty = emptyIndices(board);
    if (empty.length === 0) break;
    board[pickIndex(empty, random)] = pickWeighted(SPAWN_VALUES, SPAWN_WEIGHTS, random);
  }

  return {
    board,
    score: 0,
    bestScore,
    moves: 0,
    hasWon: false,
    endless: false,
    status: "active",
    undo: null,
    seed,
    random,
  };
}

/**
 * Slides the board and, if anything moved, places a new tile.
 *
 * The result is the new game state with the report of the move added to it, so the caller can
 * assign it straight back to the game's state and read `changed`, `gained`, `merged`,
 * `transitions`, and `spawned` to drive the animation.
 *
 * @param {import("./types.js").Game} game
 * @param {import("./types.js").Direction} direction
 * @returns {import("./types.js").MoveResult} The new state and the report of the move.
 */
export function applyMove(game, direction) {
  const result = slide(game.board, direction);

  if (!result.moved) {
    // A move that changes nothing is not a turn: no tile is placed, the score does not change,
    // and the undo snapshot is not replaced. The game still ends here, because a board that is
    // full and has no equal neighbours cannot be changed by any slide, so this is the only
    // moment the end of the game can be noticed.
    return {
      ...game,
      status: hasAvailableMoves(game.board) ? game.status : "gameover",
      changed: false,
      gained: 0,
      merged: [],
      transitions: result.transitions,
      spawned: null,
    };
  }

  const board = result.board.slice();
  const empty = emptyIndices(board);
  let spawned = null;
  if (empty.length > 0) {
    const index = pickIndex(empty, game.random);
    const value = pickWeighted(SPAWN_VALUES, SPAWN_WEIGHTS, game.random);
    board[index] = value;
    spawned = { index, value };
  }

  const score = game.score + result.gained;
  const bestScore = Math.max(game.bestScore, score);
  const moves = game.moves + 1;

  let hasWon = game.hasWon;
  let status = game.status;
  if (!hasWon && board.some((value) => value >= TARGET_VALUE)) {
    hasWon = true;
    status = "won";
  } else if (status === "won" && game.endless) {
    // The player chose to keep playing, so the win is not raised again.
    status = "active";
  }
  if (!hasAvailableMoves(board)) {
    status = "gameover";
  }

  return {
    ...game,
    board,
    score,
    bestScore,
    moves,
    hasWon,
    status,
    undo: {
      board: game.board.slice(),
      score: game.score,
      bestScore: game.bestScore,
      moves: game.moves,
    },
    changed: true,
    gained: result.gained,
    merged: result.merged,
    transitions: result.transitions,
    spawned,
  };
}

/**
 * Chooses to keep playing after a win.
 *
 * The game carries on, and no further win is raised.
 *
 * @param {import("./types.js").Game} game
 * @returns {import("./types.js").Game} The new state, or the same state when there is no win to
 *   keep playing after.
 */
export function keepPlaying(game) {
  if (game.status !== "won") return game;
  return { ...game, endless: true, status: "active" };
}

/**
 * Restores the state before the most recent valid move.
 *
 * The best score is never restored downwards: it keeps the higher of its current value and the
 * snapshot's.
 *
 * @param {import("./types.js").Game} game
 * @returns {import("./types.js").Game} The restored state, or the same state when there is nothing
 *   to undo.
 */
export function undo(game) {
  const snapshot = game.undo;
  if (!snapshot) return game;

  const board = snapshot.board.slice();
  const bestScore = Math.max(game.bestScore, snapshot.bestScore);
  const restored = statusFor(board);
  const status = game.endless && restored === "won" ? "active" : restored;

  return {
    ...game,
    board,
    score: snapshot.score,
    bestScore,
    moves: snapshot.moves,
    status,
    undo: null,
    // The report of the move that was undone does not describe the restored state, so it is
    // cleared rather than left to be read as if it did.
    changed: false,
    gained: 0,
    merged: [],
    transitions: [],
    spawned: null,
  };
}

/**
 * Whether a move can be undone.
 * @param {import("./types.js").Game} game
 * @returns {boolean}
 */
export function canUndo(game) {
  return game.undo !== null && game.undo !== undefined;
}
