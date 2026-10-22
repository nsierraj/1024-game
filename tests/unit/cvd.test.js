import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The colour-blind-safe theme under a red-green colour vision simulation (FR-022, SC-008).
 *
 * Deuteranopia and protanopia are simulated with the Machado, Oliveira, and Fernandes (2009)
 * matrices at full severity, applied in linear RGB. Two colours are then compared in CIELAB with
 * the CIE76 difference. A difference of about 2.3 is the smallest a viewer notices; the check asks
 * for 15, which is clearly distinct at a glance. The numbers on the tiles are always shown (FR-050),
 * so this is the second cue, not the only one.
 */

const MIN_DELTA_E = 15;

const MATRICES = {
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
};

const VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, "high"];

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function linearRgb(hex) {
  return [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
}

function simulate(rgb, matrix) {
  return matrix.map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
}

function lab([r, g, b]) {
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const [fx, fy, fz] = [f(x / 0.95047), f(y), f(z / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function themeTiles() {
  const css = readFileSync(join(process.cwd(), "src/styles/themes.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const start = css.indexOf(':root[data-theme="colorblind"] {');
  assert.ok(start >= 0, "no colour-blind-safe block");
  const body = css.slice(start, css.indexOf("}", start));
  return VALUES.map((value) => {
    const match = body.match(new RegExp(`--tile-${value}-bg:\\s*(#[0-9a-fA-F]{6})`));
    assert.ok(match, `tile ${value} has no background`);
    return match[1];
  });
}

describe("colour-blind-safe theme under red-green simulation (FR-022)", () => {
  const tiles = themeTiles();

  for (const [deficiency, matrix] of Object.entries(MATRICES)) {
    it(`keeps every pair of neighbouring values at least ${MIN_DELTA_E} apart under ${deficiency}`, () => {
      const seen = tiles.map((hex) => lab(simulate(linearRgb(hex), matrix)));
      const shortfalls = [];
      for (let i = 1; i < seen.length; i += 1) {
        const difference = deltaE(seen[i - 1], seen[i]);
        if (difference < MIN_DELTA_E) shortfalls.push(`${VALUES[i - 1]} and ${VALUES[i]}: ${difference.toFixed(1)}`);
      }
      assert.deepEqual(shortfalls, []);
    });
  }

  it("keeps the simulation honest: it sees red and green as nearly the same", () => {
    // A control: pure red and pure green must come out close under deuteranopia, or the matrices are wrong.
    const red = lab(simulate(linearRgb("#ff0000"), MATRICES.deuteranopia));
    const green = lab(simulate(linearRgb("#00a000"), MATRICES.deuteranopia));
    const unsimulated = deltaE(lab(linearRgb("#ff0000")), lab(linearRgb("#00a000")));
    assert.ok(deltaE(red, green) < unsimulated / 2, "red and green are not closer after simulation");
  });
});
