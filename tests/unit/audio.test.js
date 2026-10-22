import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAudio, effectFor } from "../../src/services/audio.js";
import { EFFECT_IDS } from "../../src/services/sound-synth.js";

/**
 * A stand-in for an AudioContext. `resumeMode` decides what resume() does:
 * "sync" runs at once, "async" settles on a later tick (as WebKit does), "stay" resolves while the
 * context stays suspended, and "reject" rejects.
 */
function fakeContext({ resumeMode = "sync", sampleRate = 48000, state = "suspended" } = {}) {
  const listeners = new Set();
  const ctx = {
    state,
    sampleRate,
    currentTime: 0,
    destination: { kind: "destination" },
    resumeMode,
    resumeCalls: 0,
    sources: [],
    buffersMade: [],
    addEventListener(type, handler) {
      if (type === "statechange") listeners.add(handler);
    },
    setState(next) {
      ctx.state = next;
      for (const handler of listeners) handler();
    },
    resume() {
      ctx.resumeCalls += 1;
      if (ctx.resumeMode === "reject") return Promise.reject(new Error("blocked"));
      if (ctx.resumeMode === "stay") return Promise.resolve();
      if (ctx.resumeMode === "sync") {
        ctx.setState("running");
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          ctx.setState("running");
          resolve();
        }, 0);
      });
    },
    createBuffer(channels, length, rate) {
      const data = new Float32Array(length);
      const buffer = { channels, length, sampleRate: rate, data, copyToChannel: (samples) => data.set(samples) };
      ctx.buffersMade.push(buffer);
      return buffer;
    },
    createGain() {
      return { gain: { value: 1 }, connect() {} };
    },
    createDynamicsCompressor() {
      return {
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 },
        connect() {},
      };
    },
    createBufferSource() {
      const source = {
        buffer: null,
        started: false,
        stopped: false,
        connect() {},
        start() {
          source.started = true;
        },
        stop() {
          source.stopped = true;
          if (source.onended) source.onended();
        },
      };
      ctx.sources.push(source);
      return source;
    },
  };
  return ctx;
}

const later = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("effectFor (FR-008, FR-012)", () => {
  it("gives each event exactly one effect", () => {
    assert.equal(effectFor("move"), "move");
    assert.equal(effectFor("merge"), "merge");
    assert.equal(effectFor("undo"), "undo");
    assert.equal(effectFor("undo-from-game-over"), "undo");
    assert.equal(effectFor("win"), "win");
    assert.equal(effectFor("gameover"), "gameover");
  });

  it("never gives undo the move sound", () => {
    assert.notEqual(effectFor("undo"), effectFor("move"));
    assert.notEqual(effectFor("undo-from-game-over"), effectFor("move"));
  });

  it("gives an unknown event no effect", () => {
    assert.equal(effectFor("nonsense"), null);
  });
});

describe("the audio state (FR-014)", () => {
  it("starts off and creates nothing until the first enable (FR-013)", () => {
    let made = 0;
    const audio = createAudio({ contextFactory: () => (made += 1, fakeContext()) });

    assert.equal(audio.state(), "off");
    assert.equal(made, 0);
  });

  it("turns on when resume() succeeds at once", async () => {
    const ctx = fakeContext({ resumeMode: "sync" });
    const audio = createAudio({ contextFactory: () => ctx });

    const result = await audio.enable();

    assert.equal(result, true);
    assert.equal(audio.state(), "on");
  });

  it("turns on when resume() settles later, as WebKit does, and is arming until then", async () => {
    const ctx = fakeContext({ resumeMode: "async" });
    const audio = createAudio({ contextFactory: () => ctx });

    const pending = audio.enable();
    assert.equal(audio.state(), "arming", "must not decide from the state read straight after resume()");

    assert.equal(await pending, true);
    assert.equal(audio.state(), "on");
  });

  it("calls resume() before anything is awaited, so it is still inside the gesture", () => {
    const ctx = fakeContext({ resumeMode: "async" });
    const audio = createAudio({ contextFactory: () => ctx });

    audio.enable();

    assert.equal(ctx.resumeCalls, 1);
  });

  it("shows off when resume() is rejected", async () => {
    const audio = createAudio({ contextFactory: () => fakeContext({ resumeMode: "reject" }) });

    assert.equal(await audio.enable(), false);
    assert.equal(audio.state(), "off");
  });

  it("shows off when resume() resolves but the context is still not running", async () => {
    const audio = createAudio({ contextFactory: () => fakeContext({ resumeMode: "stay" }) });

    assert.equal(await audio.enable(), false);
    assert.equal(audio.state(), "off");
  });

  it("shows off when the browser has no audio at all", async () => {
    const audio = createAudio({ contextFactory: () => null });

    assert.equal(await audio.enable(), false);
    assert.equal(audio.state(), "off");
  });

  it("is on only while the context is running", async () => {
    const ctx = fakeContext();
    const audio = createAudio({ contextFactory: () => ctx });
    await audio.enable();

    ctx.setState("interrupted");
    assert.equal(audio.state(), "suspended");

    ctx.setState("running");
    assert.equal(audio.state(), "on");
  });

  it("tells a listener each time the state changes", async () => {
    const ctx = fakeContext();
    const seen = [];
    const audio = createAudio({ contextFactory: () => ctx });
    audio.onChange((state) => seen.push(state));

    await audio.enable();
    ctx.setState("suspended");
    audio.disable();

    assert.deepEqual(seen, ["arming", "on", "suspended", "off"]);
  });

  it("turns off and plays nothing after disable", async () => {
    const ctx = fakeContext();
    const audio = createAudio({ contextFactory: () => ctx });
    await audio.enable();
    ctx.sources.length = 0;

    audio.disable();
    audio.play("move");

    assert.equal(audio.state(), "off");
    assert.equal(ctx.sources.length, 0);
  });
});

describe("rendering the effects (FR-013, R-02)", () => {
  it("renders the five effects at the context's own sample rate, on the first enable only", async () => {
    const ctx = fakeContext({ sampleRate: 48000 });
    const audio = createAudio({ contextFactory: () => ctx });

    await audio.enable();
    const first = ctx.buffersMade.filter((buffer) => buffer.length > 1);
    assert.equal(first.length, EFFECT_IDS.length);
    for (const buffer of first) assert.equal(buffer.sampleRate, 48000);

    audio.disable();
    await audio.enable();
    assert.equal(ctx.buffersMade.filter((buffer) => buffer.length > 1).length, EFFECT_IDS.length, "rendered again");
  });

  it("downloads nothing", async () => {
    const original = globalThis.fetch;
    let fetched = 0;
    globalThis.fetch = async () => {
      fetched += 1;
      throw new Error("no network");
    };

    try {
      const audio = createAudio({ contextFactory: () => fakeContext() });
      await audio.enable();
      audio.play("merge");
      assert.equal(fetched, 0);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("playing (FR-011)", () => {
  it("plays nothing unless the state is on", () => {
    const ctx = fakeContext();
    const audio = createAudio({ contextFactory: () => ctx });

    audio.play("move");

    assert.equal(ctx.sources.length, 0);
  });

  it("starts a source for each effect once on", async () => {
    const ctx = fakeContext();
    const audio = createAudio({ contextFactory: () => ctx });
    await audio.enable();
    ctx.sources.length = 0;

    for (const id of EFFECT_IDS) audio.play(id);

    // All five start; the voice cap then stops the oldest two so only three keep sounding.
    assert.equal(ctx.sources.filter((source) => source.started).length, EFFECT_IDS.length);
  });

  it("keeps at most 3 voices, stopping the oldest", async () => {
    const ctx = fakeContext();
    const audio = createAudio({ contextFactory: () => ctx });
    await audio.enable();
    ctx.sources.length = 0;

    audio.play("win");
    audio.play("gameover");
    audio.play("undo");
    audio.play("move");

    const started = ctx.sources.filter((source) => source.started);
    assert.equal(started.length, 4);
    assert.equal(started[0].stopped, true, "the oldest voice should have been stopped");
    assert.equal(started.filter((source) => !source.stopped).length, 3);
  });

  it("replaces a merge that comes within 60 ms of the last one", async () => {
    const ctx = fakeContext();
    const audio = createAudio({ contextFactory: () => ctx });
    await audio.enable();
    ctx.sources.length = 0;

    audio.play("merge");
    ctx.currentTime = 0.03;
    audio.play("merge");

    const started = ctx.sources.filter((source) => source.started);
    assert.equal(started.length, 2);
    assert.equal(started[0].stopped, true);
    assert.equal(started[1].stopped, false);
  });

  it("layers a merge that comes more than 60 ms after the last one", async () => {
    const ctx = fakeContext();
    const audio = createAudio({ contextFactory: () => ctx });
    await audio.enable();
    ctx.sources.length = 0;

    audio.play("merge");
    ctx.currentTime = 0.2;
    audio.play("merge");

    assert.equal(ctx.sources.filter((source) => source.stopped).length, 0);
  });
});

describe("a saved choice after a reload (FR-014)", () => {
  it("shows off until the first gesture, then turns on by itself", async () => {
    const ctx = fakeContext({ resumeMode: "async" });
    let made = 0;
    const audio = createAudio({ contextFactory: () => (made += 1, ctx) });

    audio.restore();
    assert.equal(audio.state(), "suspended");
    assert.equal(made, 0, "the context must be created inside the first gesture, not at startup");

    audio.unlock();
    await later();

    assert.equal(made, 1);
    assert.equal(audio.state(), "on");
  });

  it("does nothing on a gesture when the choice was not saved", () => {
    let made = 0;
    const audio = createAudio({ contextFactory: () => (made += 1, fakeContext()) });

    audio.unlock();

    assert.equal(audio.state(), "off");
    assert.equal(made, 0);
  });

  it("stays suspended when the first gesture cannot start sound, ready for the next one", async () => {
    const ctx = fakeContext({ resumeMode: "stay" });
    const audio = createAudio({ contextFactory: () => ctx });
    audio.restore();

    audio.unlock();
    await later();
    assert.equal(audio.state(), "suspended");

    ctx.resumeMode = "sync";
    audio.unlock();
    await later();
    assert.equal(audio.state(), "on");
  });

  it("is turned on by the toggle too, from the suspended state", async () => {
    const audio = createAudio({ contextFactory: () => fakeContext() });
    audio.restore();

    assert.equal(await audio.enable(), true);
    assert.equal(audio.state(), "on");
  });

  it("goes back to suspended and then on when the page is hidden and shown again", async () => {
    const ctx = fakeContext();
    const audio = createAudio({ contextFactory: () => ctx });
    await audio.enable();

    ctx.setState("interrupted");
    assert.equal(audio.state(), "suspended");

    audio.unlock();
    await later();

    assert.equal(audio.state(), "on");
  });
});
