import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { MOVE_DURATION, playMove } from "../../src/ui/animations.js";

/**
 * A stand-in for a tile, with just enough of an element for the animation to act on.
 * @returns {object}
 */
function fakeTile() {
  const classes = new Set();

  return {
    removed: false,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      has: (name) => classes.has(name),
    },
    remove() {
      this.removed = true;
    },
  };
}

describe("playMove", () => {
  it("finishes inside the 150 milliseconds the contract allows", () => {
    // The slide and the merge overlap, so the move is over in well under the limit.
    // (FR-036, SC-009)
    assert.ok(MOVE_DURATION > 0);
    assert.ok(MOVE_DURATION <= 150, `expected the move to take at most 150ms, got ${MOVE_DURATION}`);
  });

  it("marks the tiles that merged, were absorbed, and appeared", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });

    try {
      const merging = fakeTile();
      const absorbed = fakeTile();
      const spawned = fakeTile();

      const finished = playMove({
        merging: [merging],
        absorbed: [absorbed],
        spawned: [spawned],
      });

      assert.equal(merging.classList.has("tile--merged"), true);
      assert.equal(absorbed.classList.has("tile--absorbed"), true);
      assert.equal(spawned.classList.has("tile--spawned"), true);

      mock.timers.tick(MOVE_DURATION);
      await finished;

      assert.equal(merging.classList.has("tile--merged"), false);
      assert.equal(absorbed.classList.has("tile--absorbed"), false);
      assert.equal(spawned.classList.has("tile--spawned"), false);
    } finally {
      mock.timers.reset();
    }
  });

  it("takes the absorbed tile off the page once the move is over", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });

    try {
      const absorbed = fakeTile();
      const finished = playMove({ absorbed: [absorbed] });

      assert.equal(absorbed.removed, false);

      mock.timers.tick(MOVE_DURATION);
      await finished;

      assert.equal(absorbed.removed, true);
    } finally {
      mock.timers.reset();
    }
  });

  it("resolves for a move that touched nothing", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });

    try {
      const finished = playMove({});
      mock.timers.tick(MOVE_DURATION);
      await finished;
    } finally {
      mock.timers.reset();
    }
  });
});
