import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { MOVE_CAP, playMove } from "../../src/ui/animations.js";

/**
 * A stand-in for a running animation: `finished` settles when the test says so.
 * @returns {{finished: Promise<void>, finish: () => void}}
 */
function fakeAnimation() {
  let finish;
  const finished = new Promise((resolve) => {
    finish = resolve;
  });
  return { finished, finish };
}

/**
 * A stand-in for a tile, with just enough of an element for the animation to act on.
 * @param {object[]} [animations] The animations the tile is running.
 * @returns {object}
 */
function fakeTile(animations = []) {
  const classes = new Set();

  return {
    removed: false,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      has: (name) => classes.has(name),
    },
    getAnimations: () => animations,
    remove() {
      this.removed = true;
    },
  };
}

/** Lets the promise jobs queued so far run. */
async function settle() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe("playMove", () => {
  it("stops waiting by 160 ms at the latest, which is inside the limit plus a frame (FR-005)", () => {
    assert.ok(MOVE_CAP > 150);
    assert.ok(MOVE_CAP <= 170);
  });

  it("marks the tiles that merged, were absorbed, and appeared", async () => {
    const merging = fakeTile();
    const absorbed = fakeTile();
    const spawned = fakeTile();

    const finished = playMove({ merging: [merging], absorbed: [absorbed], spawned: [spawned] });

    assert.equal(merging.classList.has("tile--merged"), true);
    assert.equal(absorbed.classList.has("tile--absorbed"), true);
    assert.equal(spawned.classList.has("tile--spawned"), true);

    await finished;

    assert.equal(merging.classList.has("tile--merged"), false);
    assert.equal(absorbed.classList.has("tile--absorbed"), false);
    assert.equal(spawned.classList.has("tile--spawned"), false);
  });

  it("waits for every animation to finish, not for a fixed time", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });

    try {
      const slide = fakeAnimation();
      const merge = fakeAnimation();
      const moving = fakeTile([slide]);
      const merging = fakeTile([merge]);
      let done = false;

      const finished = playMove({ moving: [moving], merging: [merging] }).then(() => {
        done = true;
      });

      slide.finish();
      await settle();
      assert.equal(done, false, "resolved before the merge animation finished");

      merge.finish();
      await finished;
      assert.equal(done, true);
    } finally {
      mock.timers.reset();
    }
  });

  it("gives up at the cap if an animation never finishes", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });

    try {
      const stuck = fakeAnimation();
      const finished = playMove({ moving: [fakeTile([stuck])] });

      mock.timers.tick(MOVE_CAP);
      await finished;
    } finally {
      mock.timers.reset();
    }
  });

  it("resolves at once for a move that touched nothing and runs no animation", async () => {
    await playMove({});
    await playMove({ moving: [fakeTile()] });
  });

  it("takes the absorbed tile off the page once the move is over", async () => {
    const absorbed = fakeTile();
    const finished = playMove({ absorbed: [absorbed] });

    assert.equal(absorbed.removed, false);

    await finished;

    assert.equal(absorbed.removed, true);
  });

  it("resolves at once and removes the absorbed tile when reduced motion is on (FR-007)", async () => {
    const original = globalThis.window;
    globalThis.window = { matchMedia: () => ({ matches: true }) };

    try {
      const absorbed = fakeTile([fakeAnimation()]);
      await playMove({ absorbed: [absorbed] });
      assert.equal(absorbed.removed, true);
    } finally {
      globalThis.window = original;
    }
  });
});
