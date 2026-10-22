import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveSwipe, SWIPE_FRACTION } from "../../src/ui/swipe.js";

describe("swipe", () => {
  it("ignores a horizontal swipe under one quarter of the width", () => {
    const width = 400;
    assert.equal(resolveSwipe(width * SWIPE_FRACTION - 1, 0, width, 400), null);
  });

  it("ignores a vertical swipe under one quarter of the height", () => {
    const height = 400;
    assert.equal(resolveSwipe(0, height * SWIPE_FRACTION - 1, 400, height), null);
  });

  it("swipe of exactly one quarter counts as a move", () => {
    const width = 400;
    assert.equal(resolveSwipe(width * SWIPE_FRACTION, 0, width, 400), "right");
    assert.equal(resolveSwipe(-(width * SWIPE_FRACTION), 0, width, 400), "left");
    const height = 400;
    assert.equal(resolveSwipe(0, height * SWIPE_FRACTION, 400, height), "down");
    assert.equal(resolveSwipe(0, -(height * SWIPE_FRACTION), 400, height), "up");
  });

  it("swipe over the threshold moves in the dominant axis", () => {
    const width = 400;
    assert.equal(resolveSwipe(width * 0.5, width * 0.1, width, 400), "right");
  });

  it("a diagonal swipe resolves to the axis with the greater absolute travel", () => {
    const width = 400;
    assert.equal(resolveSwipe(100, 200, width, 400), "down");
    assert.equal(resolveSwipe(200, 100, width, 400), "right");
  });
});
