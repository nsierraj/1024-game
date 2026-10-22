import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createEmptyBoard,
  hasAvailableMoves,
  hasNoAdjacentEqual,
  slide,
} from "../../src/core/board.js";

/**
 * Builds a board from four rows of four numbers.
 * @param {number[][]} rows
 * @returns {number[]}
 */
function boardOf(...rows) {
  return rows.flat();
}

/**
 * Builds a board from a single row, with the other three rows empty.
 * @param {number[]} row
 * @returns {number[]}
 */
function rowOf(...row) {
  return boardOf(row, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
}

/**
 * Builds a board from a single column, with the other three columns empty.
 * @param {number[]} column
 * @returns {number[]}
 */
function columnOf(...column) {
  return boardOf(
    [column[0], 0, 0, 0],
    [column[1], 0, 0, 0],
    [column[2], 0, 0, 0],
    [column[3], 0, 0, 0],
  );
}

describe("createEmptyBoard", () => {
  it("creates a 4x4 board of empty cells (FR-001)", () => {
    const board = createEmptyBoard();

    assert.equal(board.length, 16);
    assert.deepEqual(board, new Array(16).fill(0));
  });

  it("creates a board of the requested size", () => {
    assert.equal(createEmptyBoard(3).length, 9);
    assert.equal(createEmptyBoard(5).length, 25);
  });
});

describe("slide", () => {
  it("compacts tiles toward the requested edge (FR-006)", () => {
    const board = rowOf(0, 0, 0, 2);

    assert.deepEqual(slide(board, "left").board, rowOf(2, 0, 0, 0));
  });

  it("compacts toward the right edge (FR-006)", () => {
    const board = rowOf(2, 0, 0, 0);

    assert.deepEqual(slide(board, "right").board, rowOf(0, 0, 0, 2));
  });

  it("compacts toward the top edge (FR-006)", () => {
    const board = columnOf(0, 0, 0, 2);

    assert.deepEqual(slide(board, "up").board, columnOf(2, 0, 0, 0));
  });

  it("compacts toward the bottom edge (FR-006)", () => {
    const board = columnOf(2, 0, 0, 0);

    assert.deepEqual(slide(board, "down").board, columnOf(0, 0, 0, 2));
  });

  it("keeps the relative order of the tiles (FR-006)", () => {
    const board = rowOf(0, 2, 0, 4);

    assert.deepEqual(slide(board, "left").board, rowOf(2, 4, 0, 0));
  });

  it("moves every tile as far as it can (FR-006)", () => {
    const board = boardOf(
      [0, 2, 0, 4],
      [0, 8, 0, 16],
      [0, 0, 0, 32],
      [0, 0, 0, 0],
    );

    assert.deepEqual(
      slide(board, "left").board,
      boardOf(
        [2, 4, 0, 0],
        [8, 16, 0, 0],
        [32, 0, 0, 0],
        [0, 0, 0, 0],
      ),
    );
  });

  it("merges equal neighbours into one tile (FR-007)", () => {
    const result = slide(rowOf(2, 2, 0, 0), "left");

    assert.deepEqual(result.board, rowOf(4, 0, 0, 0));
    assert.equal(result.gained, 4);
    assert.deepEqual(result.merged, [2]);
  });

  it("merges equal neighbours in a column (FR-007)", () => {
    const result = slide(columnOf(4, 4, 0, 0), "up");

    assert.deepEqual(result.board, columnOf(8, 0, 0, 0));
    assert.equal(result.gained, 8);
  });

  it("merges a tile at most once per move (FR-008)", () => {
    const result = slide(rowOf(2, 2, 2, 2), "left");

    assert.deepEqual(result.board, rowOf(4, 4, 0, 0));
    assert.equal(result.gained, 8);
    assert.deepEqual(result.merged, [2, 2]);
  });

  it("does not let a merged tile merge again in the same move (FR-008)", () => {
    const result = slide(rowOf(2, 2, 4, 4), "left");

    assert.deepEqual(result.board, rowOf(4, 8, 0, 0));
    assert.equal(result.gained, 12);
  });

  it("merges the pair closest to the destination edge first (FR-009)", () => {
    const result = slide(rowOf(2, 2, 2, 0), "left");

    assert.deepEqual(result.board, rowOf(4, 2, 0, 0));
  });

  it("merges the pair closest to the right edge first (FR-009)", () => {
    const result = slide(rowOf(0, 2, 2, 2), "right");

    assert.deepEqual(result.board, rowOf(0, 0, 2, 4));
  });

  it("merges the pair closest to the bottom edge first (FR-009)", () => {
    const result = slide(columnOf(2, 2, 2, 0), "down");

    assert.deepEqual(result.board, columnOf(0, 0, 2, 4));
  });

  it("awards the value of the newly merged tile (FR-014)", () => {
    const result = slide(rowOf(8, 8, 0, 0), "left");

    assert.equal(result.gained, 16);
    assert.deepEqual(result.merged, [8]);
  });

  it("awards the sum of every merge in the move (FR-014)", () => {
    const result = slide(rowOf(2, 2, 8, 8), "left");

    assert.equal(result.gained, 20);
    assert.deepEqual(result.merged, [2, 8]);
  });

  it("reports that the board did not change when nothing moved (FR-005)", () => {
    const board = rowOf(2, 4, 8, 16);

    const result = slide(board, "left");

    assert.equal(result.moved, false);
    assert.deepEqual(result.board, board);
    assert.equal(result.gained, 0);
  });

  it("reports that the board changed when a tile shifted", () => {
    const result = slide(rowOf(0, 0, 0, 2), "left");

    assert.equal(result.moved, true);
  });

  it("does not modify the board it was given", () => {
    const board = rowOf(2, 2, 4, 8);
    const copy = board.slice();

    slide(board, "left");

    assert.deepEqual(board, copy);
  });

  it("refuses a direction it does not know", () => {
    assert.throws(() => slide(rowOf(2, 2, 4, 8), "sideways"), /direction/);
  });

  it("gives one transition for every occupied cell of the result", () => {
    const result = slide(rowOf(2, 0, 4, 0), "left");

    assert.equal(result.transitions.length, 2);
    assert.deepEqual(result.transitions, [
      { from: 0, to: 0, value: 2 },
      { from: 2, to: 1, value: 4 },
    ]);
  });

  it("gives a transition the source and the destination of a tile that moved", () => {
    const result = slide(rowOf(0, 0, 0, 2), "left");

    assert.deepEqual(result.transitions, [{ from: 3, to: 0, value: 2 }]);
  });

  it("gives the merged value to the transition of a tile that merged", () => {
    const result = slide(rowOf(2, 2, 0, 0), "left");

    assert.deepEqual(result.transitions, [{ from: 0, to: 0, value: 4 }]);
  });

  it("leaves the absorbed tile of a merge without a transition of its own", () => {
    const result = slide(rowOf(2, 2, 0, 0), "left");

    // The tile at index 1 was absorbed, so it has no entry. The renderer finds it by taking the
    // difference between the occupied source cells and the sources of the transitions.
    const sources = new Set(result.transitions.map((transition) => transition.from));
    assert.equal(sources.has(1), false);
  });

  it("orders the transitions by their destination", () => {
    // A rightward slide fills a row from its right edge, so the tiles land out of order as they
    // are found. The list is ordered by destination so it reads in board order.
    const board = boardOf([2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);

    const result = slide(board, "right");

    assert.deepEqual(
      result.transitions.map((transition) => transition.to),
      [2, 3],
    );
  });

  it("orders the transitions of a whole board by their destination", () => {
    const board = boardOf(
      [0, 0, 0, 2],
      [0, 0, 0, 4],
      [0, 0, 0, 8],
      [0, 0, 0, 16],
    );

    const result = slide(board, "left");

    assert.deepEqual(
      result.transitions.map((transition) => transition.to),
      [0, 4, 8, 12],
    );
  });
});

describe("hasNoAdjacentEqual", () => {
  it("finds no equal neighbours in a sparse board", () => {
    const board = boardOf(
      [2, 4, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 32, 64, 128],
    );

    assert.equal(hasNoAdjacentEqual(board), true);
  });

  it("finds equal neighbours side by side", () => {
    assert.equal(hasNoAdjacentEqual(rowOf(2, 2, 0, 0)), false);
  });

  it("finds equal neighbours one above the other", () => {
    assert.equal(hasNoAdjacentEqual(columnOf(2, 2, 0, 0)), false);
  });

  it("does not count diagonal neighbours", () => {
    const board = boardOf([2, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);

    assert.equal(hasNoAdjacentEqual(board), true);
  });

  it("ignores empty cells", () => {
    assert.equal(hasNoAdjacentEqual(rowOf(0, 0, 0, 0)), true);
  });
});

describe("hasAvailableMoves", () => {
  it("finds a move on a board with an empty cell", () => {
    assert.equal(hasAvailableMoves(rowOf(2, 4, 8, 16)), true);
  });

  it("finds a merge on a full board", () => {
    const board = boardOf(
      [2, 2, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 32, 64, 128],
    );

    assert.equal(hasAvailableMoves(board), true);
  });

  it("finds no move on a full board with no equal neighbours (FR-022)", () => {
    const board = boardOf(
      [2, 4, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 32, 64, 128],
    );

    assert.equal(hasAvailableMoves(board), false);
  });
});
