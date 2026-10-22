import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyMove, canUndo, createGame, keepPlaying, undo } from "../../src/core/game.js";
import { createRandom } from "../../src/core/random.js";

/**
 * A random source that hands out the given values in order, and repeats the last one forever.
 * @param {number[]} values
 * @returns {() => number}
 */
function randomOf(...values) {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

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
 * How many cells hold a tile.
 * @param {number[]} board
 * @returns {number}
 */
function tileCount(board) {
  return board.filter((value) => value !== 0).length;
}

/**
 * A game with a known board, ready to be played.
 * @param {number[]} board
 * @param {object} [overrides]
 * @returns {import("../../src/core/types.js").Game}
 */
function gameWith(board, overrides = {}) {
  return { ...createGame({ random: randomOf(0) }), board, ...overrides };
}

describe("createGame", () => {
  it("starts with exactly two tiles (FR-002)", () => {
    const game = createGame({ random: randomOf(0, 0, 0, 0) });

    assert.equal(tileCount(game.board), 2);
  });

  it("starts with no score and no moves (FR-002)", () => {
    const game = createGame({ random: randomOf(0, 0, 0, 0) });

    assert.equal(game.score, 0);
    assert.equal(game.bestScore, 0);
    assert.equal(game.moves, 0);
    assert.equal(game.status, "active");
    assert.equal(game.hasWon, false);
    assert.equal(game.endless, false);
    assert.equal(game.undo, null);
  });

  it("starts with the two tiles in different cells (FR-002)", () => {
    const game = createGame({ random: randomOf(0, 0, 0.9, 0) });

    const occupied = game.board
      .map((value, index) => (value === 0 ? -1 : index))
      .filter((index) => index >= 0);

    assert.equal(occupied.length, 2);
    assert.notEqual(occupied[0], occupied[1]);
  });

  it("carries a best score over from a previous game (FR-016)", () => {
    const game = createGame({ random: randomOf(0, 0, 0, 0), bestScore: 120 });

    assert.equal(game.bestScore, 120);
  });

  it("spawns a 2 with probability 0.9 and a 4 with probability 0.1 (FR-003)", () => {
    const random = createRandom(4242);
    const games = 20000;
    let fours = 0;
    let tiles = 0;

    for (let index = 0; index < games; index += 1) {
      const game = createGame({ random });
      for (const value of game.board) {
        if (value === 0) continue;
        tiles += 1;
        if (value === 4) fours += 1;
      }
    }

    const share = fours / tiles;
    assert.ok(share > 0.08, `expected about a tenth of the tiles to be 4, got ${share}`);
    assert.ok(share < 0.12, `expected about a tenth of the tiles to be 4, got ${share}`);
  });
});

describe("applyMove", () => {
  it("places exactly one tile after a valid move (FR-004)", () => {
    const game = gameWith(rowOf(2, 0, 0, 0));
    const before = tileCount(game.board);

    const result = applyMove(game, "right");

    assert.equal(result.changed, true);
    assert.equal(tileCount(result.board), before + 1);
    assert.notEqual(result.spawned, null);
  });

  it("places the new tile in an empty cell (FR-004)", () => {
    const game = gameWith(rowOf(2, 0, 0, 0));

    const result = applyMove(game, "right");

    assert.equal(result.spawned.index, 0);
    assert.equal(result.board[0], result.spawned.value);
  });

  it("changes nothing when the move is not possible (FR-005)", () => {
    const game = gameWith(rowOf(2, 4, 8, 16));

    const result = applyMove(game, "left");

    assert.equal(result.changed, false);
    assert.deepEqual(result.board, game.board);
    assert.equal(result.spawned, null);
    assert.equal(result.score, game.score);
    assert.equal(result.moves, game.moves);
    assert.equal(result.gained, 0);
  });

  it("does not count a move that changes nothing as a turn (FR-005)", () => {
    const game = gameWith(rowOf(2, 4, 8, 16));

    const result = applyMove(game, "left");

    assert.equal(result.moves, 0);
  });

  it("does not replace the undo snapshot when a move changes nothing (FR-005)", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));
    const moved = applyMove(game, "left");

    const rejected = applyMove(moved, "left");

    assert.deepEqual(rejected.undo, moved.undo);
  });

  it("does not modify the game it was given", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));
    const board = game.board.slice();

    applyMove(game, "left");

    assert.deepEqual(game.board, board);
    assert.equal(game.score, 0);
    assert.equal(game.moves, 0);
  });

  it("increases the score by the value of the merged tile (FR-014)", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));

    const result = applyMove(game, "left");

    assert.equal(result.gained, 4);
    assert.equal(result.score, 4);
  });

  it("adds the points of several merges (FR-014)", () => {
    const game = gameWith(rowOf(2, 2, 4, 4));

    const result = applyMove(game, "left");

    assert.equal(result.gained, 12);
    assert.equal(result.score, 12);
  });

  it("keeps the score when a move merges nothing (FR-014)", () => {
    const game = gameWith(rowOf(2, 4, 8, 16), { score: 30 });

    const result = applyMove(game, "right");

    assert.equal(result.gained, 0);
    assert.equal(result.score, 30);
  });

  it("updates the best score on a new record (FR-017)", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));

    const result = applyMove(game, "left");

    assert.equal(result.bestScore, 4);
  });

  it("keeps the best score when the score does not beat it (FR-016, FR-017)", () => {
    const game = gameWith(rowOf(2, 2, 0, 0), { bestScore: 50 });

    const result = applyMove(game, "left");

    assert.equal(result.score, 4);
    assert.equal(result.bestScore, 50);
  });

  it("never lowers the best score (FR-016)", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));
    const moved = applyMove(game, "left");

    const next = applyMove(moved, "right");

    assert.equal(next.bestScore, 4);
  });

  it("raises the win when the 1024 tile is created (FR-019)", () => {
    const game = gameWith(rowOf(512, 512, 0, 0));

    const result = applyMove(game, "left");

    assert.equal(result.board[0], 1024);
    assert.equal(result.hasWon, true);
    assert.equal(result.status, "won");
  });

  it("keeps the win raised while the player has not answered it (FR-019)", () => {
    const game = gameWith(rowOf(512, 512, 0, 0));
    const won = applyMove(game, "left");

    const next = applyMove(won, "right");

    // The win stands until the player chooses to keep playing or to start a new game.
    assert.equal(next.hasWon, true);
    assert.equal(next.status, "won");
  });

  it("keeps playing after the player chooses to (FR-021)", () => {
    const game = gameWith(rowOf(512, 512, 0, 0));
    const won = applyMove(game, "left");

    const playing = keepPlaying(won);

    assert.equal(playing.endless, true);
    assert.equal(playing.status, "active");
  });

  it("raises no further win after the player chooses to keep playing (FR-021)", () => {
    const game = gameWith(rowOf(512, 512, 0, 0));
    const won = applyMove(game, "left");
    const playing = keepPlaying(won);

    const next = applyMove(playing, "right");

    assert.equal(next.hasWon, true);
    assert.equal(next.status, "active");
  });

  it("ends the game when the board is full with no equal neighbours (FR-022)", () => {
    const board = boardOf(
      [2, 4, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 0, 32, 64],
    );

    const result = applyMove(gameWith(board), "left");

    assert.equal(result.changed, true);
    assert.equal(tileCount(result.board), 16);
    assert.equal(result.status, "gameover");
  });

  it("ends the game when a full board cannot be moved (FR-022)", () => {
    const board = boardOf(
      [2, 4, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 32, 64, 2],
    );

    const result = applyMove(gameWith(board), "left");

    assert.equal(result.changed, false);
    assert.equal(result.status, "gameover");
  });

  it("counts the moves it has played", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));

    const first = applyMove(game, "left");
    const second = applyMove(first, "right");

    assert.equal(first.moves, 1);
    assert.equal(second.moves, 2);
  });
});

describe("undo", () => {
  it("is unavailable at the start of a new game (FR-027)", () => {
    const game = createGame({ random: randomOf(0, 0, 0, 0) });

    assert.equal(canUndo(game), false);
  });

  it("becomes available after a valid move (FR-027)", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));

    const result = applyMove(game, "left");

    assert.equal(canUndo(result), true);
  });

  it("restores the board, the score, and the move count (FR-025, FR-026)", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));
    const moved = applyMove(game, "left");

    const restored = undo(moved);

    assert.deepEqual(restored.board, game.board);
    assert.equal(restored.score, 0);
    assert.equal(restored.moves, 0);
  });

  it("restores only one level (FR-025)", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));
    const moved = applyMove(game, "left");
    const movedAgain = applyMove(moved, "right");

    const restored = undo(movedAgain);

    assert.deepEqual(restored.board, moved.board);
    assert.equal(canUndo(restored), false);
  });

  it("keeps the best score when it was higher than the score before the move (FR-026)", () => {
    const game = gameWith(rowOf(2, 2, 0, 0));
    const moved = applyMove(game, "left");

    const restored = undo(moved);

    assert.equal(restored.bestScore, 4);
  });

  it("does nothing when there is nothing to undo (FR-027)", () => {
    const game = createGame({ random: randomOf(0, 0, 0, 0) });

    const restored = undo(game);

    assert.equal(restored, game);
  });

  it("is available from the game-over state (FR-028)", () => {
    const board = boardOf(
      [2, 4, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 0, 32, 64],
    );

    const result = applyMove(gameWith(board), "left");

    assert.equal(result.status, "gameover");
    assert.equal(canUndo(result), true);
  });

  it("brings the game back to life from the game-over state (FR-028)", () => {
    const board = boardOf(
      [2, 4, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 0, 32, 64],
    );
    const result = applyMove(gameWith(board), "left");

    const restored = undo(result);

    assert.equal(restored.status, "active");
    assert.equal(tileCount(restored.board), 15);
  });
});
