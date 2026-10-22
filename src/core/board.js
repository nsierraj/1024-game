/**
 * The board: sliding, merging, and the questions the game asks about a board's state.
 *
 * Nothing in this module touches the DOM, storage, the clock, or `Math.random`. It is a set of
 * pure functions over a flat array of sixteen numbers, so it can be tested in Node without a
 * browser and reasoned about without a screen.
 */

import { BOARD_SIZE } from "./constants.js";

/** The directions a board can be slid in. */
const DIRECTIONS = new Set(["up", "down", "left", "right"]);

/**
 * Creates a board of empty cells.
 * @param {number} [size] The width and height of the board.
 * @returns {number[]} A board of `size * size` zeroes.
 */
export function createEmptyBoard(size = BOARD_SIZE) {
  return new Array(size * size).fill(0);
}

/**
 * The board indices of one line, in the order the tiles travel.
 *
 * A leftward slide travels from the left edge of a row to its right, a rightward slide the other
 * way, an upward slide from the top of a column to its bottom, and a downward slide the other way.
 * The order matters: it is what decides which pair of equal tiles merges first.
 *
 * @param {number} line The row index for a horizontal slide, the column index for a vertical one.
 * @param {number} size The width and height of the board.
 * @param {import("./types.js").Direction} direction
 * @returns {number[]} The indices of the line, in travel order.
 */
function lineIndices(line, size, direction) {
  const indices = [];
  for (let step = 0; step < size; step += 1) {
    if (direction === "left") {
      indices.push(line * size + step);
    } else if (direction === "right") {
      indices.push(line * size + (size - 1 - step));
    } else if (direction === "up") {
      indices.push(step * size + line);
    } else {
      indices.push((size - 1 - step) * size + line);
    }
  }
  return indices;
}

/**
 * Slides and merges every row or column in one direction.
 *
 * Tiles compact toward the requested edge, keeping their relative order, and equal neighbours
 * merge into a single tile with double the value. A tile merges at most once per slide, and when
 * three or more equal tiles are aligned the two closest to the destination edge merge first.
 *
 * @param {number[]} board The board to slide.
 * @param {import("./types.js").Direction} direction The direction to slide in.
 * @returns {import("./types.js").SlideResult} The board after the slide, the points it awarded,
 *   and the movement of every tile that ended up on the board.
 */
export function slide(board, direction) {
  const size = Math.sqrt(board.length);
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("slide needs a square board");
  }
  if (!DIRECTIONS.has(direction)) {
    throw new Error(`slide needs a direction, got "${direction}"`);
  }

  const next = new Array(board.length).fill(0);
  const transitions = [];
  const merged = [];
  let gained = 0;

  for (let line = 0; line < size; line += 1) {
    const indices = lineIndices(line, size, direction);
    const occupied = indices.filter((index) => board[index] !== 0);
    const values = occupied.map((index) => board[index]);

    const settled = [];
    const sources = [];
    let cursor = 0;
    while (cursor < values.length) {
      const after = cursor + 1;
      if (after < values.length && values[cursor] === values[after]) {
        // The two tiles merge. The tile closest to the destination edge is the one that survives
        // and grows; the other is absorbed and has no transition of its own.
        settled.push(values[cursor] * 2);
        sources.push(occupied[cursor]);
        gained += values[cursor] * 2;
        merged.push(values[cursor]);
        cursor += 2;
      } else {
        settled.push(values[cursor]);
        sources.push(occupied[cursor]);
        cursor += 1;
      }
    }

    for (let slot = 0; slot < settled.length; slot += 1) {
      const destination = indices[slot];
      next[destination] = settled[slot];
      transitions.push({ from: sources[slot], to: destination, value: settled[slot] });
    }
  }

  let moved = false;
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== next[index]) {
      moved = true;
      break;
    }
  }

  // Ordered by destination, so the list reads in board order whatever the direction of travel.
  transitions.sort((left, right) => left.to - right.to);

  return { board: next, gained, merged, moved, transitions };
}

/**
 * Whether no two orthogonally adjacent tiles share a value.
 *
 * Diagonal neighbours do not count: they can never merge.
 *
 * @param {number[]} board
 * @returns {boolean} true when no orthogonal pair of neighbours is equal.
 */
export function hasNoAdjacentEqual(board) {
  const size = Math.sqrt(board.length);
  if (!Number.isInteger(size)) {
    throw new Error("hasNoAdjacentEqual needs a square board");
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      const value = board[index];
      if (value === 0) continue;
      if (column + 1 < size && board[index + 1] === value) return false;
      if (row + 1 < size && board[index + size] === value) return false;
    }
  }
  return true;
}

/**
 * Whether at least one slide would change the board.
 * @param {number[]} board
 * @returns {boolean} true when a tile can still move.
 */
export function hasAvailableMoves(board) {
  if (board.includes(0)) return true;
  return !hasNoAdjacentEqual(board);
}
