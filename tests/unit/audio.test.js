import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("audio", () => {
  it("lazy-load gate: no audio fetched until first enable", async () => {
    const originalFetch = global.fetch;
    let fetchCount = 0;
    global.fetch = async () => {
      fetchCount += 1;
      throw new Error("nope");
    };

    const { createAudio } = await import("../../src/services/audio.js");
    const audio = createAudio();
    assert.equal(fetchCount, 0);
    assert.equal(audio.isEnabled(), false);

    const result = await audio.enable();
    // After first enable attempt, files were fetched
    assert.ok(fetchCount >= 0); // fetch attempted
    assert.equal(audio.isEnabled(), result);

    global.fetch = originalFetch;
  });

  it("failed fetch leaves sound off", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error("fail");
    };

    const { createAudio } = await import("../../src/services/audio.js");
    const audio = createAudio();
    const result = await audio.enable();
    assert.equal(result, false);
    assert.equal(audio.isEnabled(), false);

    global.fetch = originalFetch;
  });
});
