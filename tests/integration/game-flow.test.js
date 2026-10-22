import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyMove, canUndo, createGame, undo } from "../../src/core/game.js";

/**
 * A random source that always returns the same value.
 *
 * With a constant source the tile always spawns in the first empty cell and is always a 2, so
 * every move of a scripted game is exactly predictable.
 *
 * @param {number} value
 * @returns {() => number}
 */
function constantRandom(value) {
  return () => value;
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
 * The moves of the scripted game, and what each of them must produce.
 */
const SCRIPT = [
  {
    direction: "left",
    board: boardOf([4, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]),
    gained: 4,
    score: 4,
  },
  {
    direction: "right",
    board: boardOf([2, 0, 4, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]),
    gained: 0,
    score: 4,
  },
  {
    direction: "down",
    board: boardOf([2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 4, 2]),
    gained: 0,
    score: 4,
  },
  {
    direction: "up",
    board: boardOf([4, 2, 4, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]),
    gained: 4,
    score: 8,
  },
  {
    direction: "down",
    board: boardOf([2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [4, 2, 4, 2]),
    gained: 0,
    score: 8,
  },
  {
    direction: "up",
    board: boardOf([2, 2, 4, 2], [4, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]),
    gained: 0,
    score: 8,
  },
  {
    direction: "left",
    board: boardOf([4, 4, 2, 2], [4, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]),
    gained: 4,
    score: 12,
  },
];

describe("a scripted game", () => {
  it("starts on a board with two tiles and no score", () => {
    const game = createGame({ random: constantRandom(0) });

    assert.deepEqual(
      game.board,
      boardOf([2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]),
    );
    assert.equal(game.score, 0);
    assert.equal(game.bestScore, 0);
    assert.equal(game.status, "active");
    assert.equal(canUndo(game), false);
  });

  it("plays every move of the script", () => {
    let game = createGame({ random: constantRandom(0) });

    SCRIPT.forEach((step, index) => {
      const result = applyMove(game, step.direction);

      assert.equal(result.changed, true, `move ${index + 1} should change the board`);
      assert.deepEqual(result.board, step.board, `move ${index + 1} produced the wrong board`);
      assert.equal(result.gained, step.gained, `move ${index + 1} awarded the wrong points`);
      assert.equal(result.score, step.score, `move ${index + 1} produced the wrong score`);
      assert.equal(result.bestScore, step.score, `move ${index + 1} produced the wrong best score`);
      assert.equal(result.moves, index + 1, `move ${index + 1} counted the wrong number of moves`);
      assert.equal(result.status, "active", `move ${index + 1} changed the status`);

      game = result;
    });
  });

  it("keeps the best score at the high water mark", () => {
    let game = createGame({ random: constantRandom(0) });
    let best = 0;

    for (const step of SCRIPT) {
      const result = applyMove(game, step.direction);
      best = Math.max(best, result.score);
      assert.equal(result.bestScore, best);
      game = result;
    }
  });

  it("undoes the last move of the script", () => {
    let game = createGame({ random: constantRandom(0) });
    for (const step of SCRIPT) {
      game = applyMove(game, step.direction);
    }

    const restored = undo(game);

    assert.deepEqual(restored.board, SCRIPT[SCRIPT.length - 2].board);
    assert.equal(restored.score, SCRIPT[SCRIPT.length - 2].score);
    assert.equal(restored.moves, SCRIPT.length - 1);
    assert.equal(canUndo(restored), false);
  });

  it("ends the game when the board fills up and nothing can move", () => {
    const board = boardOf(
      [2, 4, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 0, 32, 64],
    );
    const game = { ...createGame({ random: constantRandom(0) }), board };

    const result = applyMove(game, "left");

    assert.equal(result.changed, true);
    assert.equal(result.spawned.index, 15);
    assert.equal(result.spawned.value, 2);
    assert.equal(result.status, "gameover");
    assert.equal(result.board.filter((value) => value !== 0).length, 16);
  });

  it("offers the undo after the game is over", () => {
    const board = boardOf(
      [2, 4, 8, 16],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 0, 32, 64],
    );
    const game = { ...createGame({ random: constantRandom(0) }), board };

    const result = applyMove(game, "left");

    assert.equal(result.status, "gameover");
    assert.equal(canUndo(result), true);

    const restored = undo(result);
    assert.equal(restored.status, "active");
    assert.equal(restored.board.filter((value) => value !== 0).length, 15);
  });
});
