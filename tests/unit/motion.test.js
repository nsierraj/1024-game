import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The motion timeline (FR-001, FR-005, FR-007, SC-003), checked from the stylesheets. Nothing here
 * can prove a frame rate, but it can prove the limit, the properties that animate, and that the
 * reduced-motion preference reaches every animation.
 */

const LIMIT_MS = 150;

/** The properties a board change may animate: the compositor-friendly ones only. */
const ALLOWED_PROPERTIES = new Set(["transform", "opacity", "scale", "translate"]);

function read(relativePath) {
  return readFileSync(join(process.cwd(), relativePath), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

const board = read("src/styles/board.css");
const base = read("src/styles/base.css");

/**
 * @param {string} name A custom property such as `--slide-duration`
 * @returns {number} its value in milliseconds
 */
function ms(name) {
  const match = board.match(new RegExp(`${name}:\\s*(\\d+)ms`));
  assert.ok(match, `${name} is not declared in board.css`);
  return Number(match[1]);
}

/**
 * The body of the first rule or block that starts with the given text, braces balanced.
 * @param {string} css
 * @param {string} start
 * @returns {string}
 */
function block(css, start) {
  const from = css.indexOf(start);
  assert.ok(from >= 0, `no block starting "${start}"`);
  let depth = 0;
  for (let i = css.indexOf("{", from); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(css.indexOf("{", from) + 1, i);
  }
  throw new Error(`unbalanced block "${start}"`);
}

describe("motion timeline (FR-005, SC-003)", () => {
  it("finishes the slide inside 150 ms", () => {
    assert.ok(ms("--slide-duration") <= LIMIT_MS);
  });

  it("finishes the merge emphasis inside 150 ms, delay included", () => {
    assert.ok(ms("--merge-delay") + ms("--merge-duration") <= LIMIT_MS);
  });

  it("finishes the new tile's entrance inside 150 ms, delay included", () => {
    assert.ok(ms("--spawn-delay") + ms("--spawn-duration") <= LIMIT_MS);
  });

  it("finishes the fade-out and the new-game cross-fade inside 150 ms", () => {
    assert.ok(ms("--fade-duration") <= LIMIT_MS);
    assert.ok(ms("--newgame-duration") <= LIMIT_MS);
  });

  it("starts the new tile's entrance after the merge emphasis has begun, so it never covers a moving tile", () => {
    assert.ok(ms("--spawn-delay") >= ms("--merge-delay"));
    assert.ok(ms("--spawn-delay") <= ms("--slide-duration"));
  });
});

describe("what animates (FR-001)", () => {
  it("transitions only transform, opacity, scale, and translate on a tile", () => {
    const tile = block(board, "\n.tile {");
    const transition = tile.match(/transition:([\s\S]*?);/);
    assert.ok(transition, "the tile declares no transition");
    // Split on the commas between transitions, not the ones inside cubic-bezier(...).
    const properties = transition[1]
      .split(/,(?![^(]*\))/)
      .map((part) => part.trim().split(/\s+/)[0]);
    for (const property of properties) {
      assert.ok(ALLOWED_PROPERTIES.has(property), `${property} is animated on a tile`);
    }
  });

  it("animates only compositor properties in the tile keyframes", () => {
    for (const name of ["tile-merge", "tile-appear"]) {
      const frames = block(board, `@keyframes ${name}`);
      const properties = [...frames.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      assert.ok(properties.length > 0, `${name} sets nothing`);
      for (const property of properties) {
        assert.ok(ALLOWED_PROPERTIES.has(property), `${name} animates ${property}`);
      }
    }
  });

  it("never moves a tile with a transform keyframe, which would drop its position", () => {
    for (const name of ["tile-merge", "tile-appear"]) {
      assert.ok(!/\btransform\s*:/.test(block(board, `@keyframes ${name}`)), `${name} sets transform`);
    }
  });

  it("holds the first frame of a delayed animation so the tile does not flash at full size", () => {
    for (const selector of [".tile--merged {", ".tile--spawned {"]) {
      assert.match(block(board, selector), /\bbackwards\b|\bboth\b/, `${selector} has no fill mode`);
    }
  });

  it("uses the timeline properties for the merge and the spawn", () => {
    assert.match(block(board, ".tile--merged {"), /var\(--merge-duration\)/);
    assert.match(block(board, ".tile--merged {"), /var\(--merge-delay\)/);
    assert.match(block(board, ".tile--spawned {"), /var\(--spawn-duration\)/);
    assert.match(block(board, ".tile--spawned {"), /var\(--spawn-delay\)/);
  });
});

describe("reduced motion (FR-007)", () => {
  const reduced = block(board, "@media (prefers-reduced-motion: reduce)");

  it("zeroes every duration and every delay for everything", () => {
    assert.match(reduced, /animation-duration:\s*0\.?\d*m?s\s*!important/);
    assert.match(reduced, /animation-delay:\s*0s\s*!important/);
    assert.match(reduced, /transition-duration:\s*0\.?\d*m?s\s*!important/);
    assert.match(reduced, /transition-delay:\s*0s\s*!important/);
    assert.match(reduced, /\*,\s*\n\s*\*::before,\s*\n\s*\*::after/);
  });

  it("removes the tile animations and transitions", () => {
    assert.match(reduced, /\.tile[\s\S]*?animation:\s*none\s*!important/);
    assert.match(reduced, /\.tile[\s\S]*?transition:\s*none\s*!important/);
  });

  it("covers every animation declared in the base stylesheet", () => {
    const declared = [...base.matchAll(/animation:\s*([a-z-]+)/g)].map((m) => m[1]);
    assert.ok(declared.length > 0);
    // The universal rule above zeroes their durations and delays, so each one ends at once.
    assert.match(reduced, /animation-iteration-count:\s*1\s*!important/);
  });
});
