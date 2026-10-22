import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EFFECT_IDS, PEAK_DBFS, RECIPES, renderEffect } from "../../src/services/sound-synth.js";

/**
 * The five sound effects, rendered from their recipes and measured. These checks stand in for a
 * listening test: they prove each effect is audible, different from the others, and free of clicks.
 * (FR-008, FR-009, FR-010, SC-005, SC-006)
 */

const SAMPLE_RATES = [44100, 48000];

const dbfs = (value) => 20 * Math.log10(value);

function peakOf(samples) {
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  return peak;
}

function rmsOf(samples) {
  let sum = 0;
  for (const value of samples) sum += value * value;
  return Math.sqrt(sum / samples.length);
}

describe("the five effects (FR-008)", () => {
  it("are exactly move, merge, undo, win, and game over", () => {
    assert.deepEqual([...EFFECT_IDS].sort(), ["gameover", "merge", "move", "undo", "win"]);
    for (const id of EFFECT_IDS) assert.equal(RECIPES[id].id, id);
  });

  it("render to samples that differ from one another at every sample rate (SC-005)", () => {
    for (const rate of SAMPLE_RATES) {
      const rendered = EFFECT_IDS.map((id) => renderEffect(RECIPES[id], rate));
      for (let a = 0; a < rendered.length; a += 1) {
        for (let b = a + 1; b < rendered.length; b += 1) {
          const sameLength = rendered[a].length === rendered[b].length;
          const identical = sameLength && rendered[a].every((value, i) => value === rendered[b][i]);
          assert.ok(!identical, `${EFFECT_IDS[a]} and ${EFFECT_IDS[b]} are identical at ${rate} Hz`);
        }
      }
    }
  });

  it("are not just the same sound at different lengths: their spectra differ", () => {
    // The zero-crossing rate follows the dominant pitch, so a different tune gives a different rate.
    const rate = 44100;
    const crossings = EFFECT_IDS.map((id) => {
      const samples = renderEffect(RECIPES[id], rate);
      let count = 0;
      for (let i = 1; i < samples.length; i += 1) if (samples[i - 1] < 0 !== samples[i] < 0) count += 1;
      return Math.round((count / samples.length) * 1000);
    });
    assert.equal(new Set(crossings).size, crossings.length, `crossing rates ${crossings}`);
  });
});

describe("level (FR-010, SC-006)", () => {
  for (const rate of SAMPLE_RATES) {
    it(`peaks between -12 and -3 dBFS at ${rate} Hz`, () => {
      for (const id of EFFECT_IDS) {
        const peak = dbfs(peakOf(renderEffect(RECIPES[id], rate)));
        assert.ok(peak >= -12 && peak <= -3, `${id} peaks at ${peak.toFixed(2)} dBFS`);
      }
    });

    it(`has the five peaks within 3 dB of each other at ${rate} Hz`, () => {
      const peaks = EFFECT_IDS.map((id) => dbfs(peakOf(renderEffect(RECIPES[id], rate))));
      assert.ok(Math.max(...peaks) - Math.min(...peaks) <= 3, `peaks ${peaks.map((p) => p.toFixed(1))}`);
    });

    it(`has an RMS spread of at most 6 dB at ${rate} Hz, so none sounds much louder than another`, () => {
      const levels = EFFECT_IDS.map((id) => dbfs(rmsOf(renderEffect(RECIPES[id], rate))));
      assert.ok(Math.max(...levels) - Math.min(...levels) <= 6, `rms ${levels.map((l) => l.toFixed(1))}`);
    });
  }

  it("aims every effect at the same target peak", () => {
    assert.equal(PEAK_DBFS, -9);
    for (const id of EFFECT_IDS) assert.equal(RECIPES[id].peak, PEAK_DBFS);
  });
});

describe("shape (FR-009)", () => {
  it("lasts long enough to be a cue and not a click, and not longer than 1.2 s", () => {
    for (const rate of SAMPLE_RATES) {
      for (const id of EFFECT_IDS) {
        const seconds = renderEffect(RECIPES[id], rate).length / rate;
        assert.ok(seconds >= 0.08 && seconds <= 1.2, `${id} lasts ${seconds.toFixed(3)} s`);
      }
    }
  });

  it("starts and ends on silence, so there is no click", () => {
    for (const rate of SAMPLE_RATES) {
      for (const id of EFFECT_IDS) {
        const samples = renderEffect(RECIPES[id], rate);
        assert.ok(Math.abs(samples[0]) <= 0.001, `${id} starts at ${samples[0]}`);
        assert.ok(Math.abs(samples[samples.length - 1]) <= 0.001, `${id} ends at ${samples[samples.length - 1]}`);
      }
    }
  });

  it("never leaves the range of a sample", () => {
    for (const id of EFFECT_IDS) {
      for (const value of renderEffect(RECIPES[id], 44100)) {
        assert.ok(Number.isFinite(value) && Math.abs(value) <= 1);
      }
    }
  });

  it("renders the same samples every time", () => {
    for (const id of EFFECT_IDS) {
      const first = renderEffect(RECIPES[id], 44100);
      const second = renderEffect(RECIPES[id], 44100);
      assert.deepEqual(first, second);
    }
  });

  it("makes the same-length sound at a different rate, just with more samples", () => {
    const low = renderEffect(RECIPES.merge, 44100).length / 44100;
    const high = renderEffect(RECIPES.merge, 48000).length / 48000;
    assert.ok(Math.abs(low - high) < 0.001);
  });
});
