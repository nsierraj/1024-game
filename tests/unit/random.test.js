import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRandom, pickWeighted } from "../../src/core/random.js";

/**
 * Collects the next `count` values from a generator.
 * @param {() => number} random
 * @param {number} count
 * @returns {number[]}
 */
function take(random, count) {
  const values = [];
  for (let index = 0; index < count; index += 1) {
    values.push(random());
  }
  return values;
}

describe("createRandom", () => {
  it("returns a function", () => {
    assert.equal(typeof createRandom(1), "function");
  });

  it("produces the same sequence for the same seed", () => {
    const first = take(createRandom(20261021), 50);
    const second = take(createRandom(20261021), 50);

    assert.deepEqual(first, second);
  });

  it("produces a different sequence for a different seed", () => {
    const first = take(createRandom(1), 50);
    const second = take(createRandom(2), 50);

    assert.notDeepEqual(first, second);
  });

  it("produces different sequences from generators created in the same tick", () => {
    // Two generators created side by side must not share state.
    const first = createRandom(99);
    const second = createRandom(99);
    first();

    assert.notDeepEqual(take(first, 20), take(second, 20));
  });

  it("keeps every value in the half-open interval [0, 1)", () => {
    const values = take(createRandom(20261021), 10000);

    for (const value of values) {
      assert.ok(value >= 0, `expected ${value} to be at least 0`);
      assert.ok(value < 1, `expected ${value} to be less than 1`);
    }
  });

  it("reduces the seed to an unsigned 32-bit integer", () => {
    // -1 and 4294967295 are the same 32-bit seed once wrapped.
    assert.deepEqual(take(createRandom(-1), 20), take(createRandom(4294967295), 20));
    assert.deepEqual(take(createRandom(0), 20), take(createRandom(4294967296), 20));
  });

  it("accepts a seed of 0", () => {
    const values = take(createRandom(0), 20);

    assert.equal(values.length, 20);
    for (const value of values) {
      assert.ok(value >= 0 && value < 1);
    }
  });

  it("spreads its values across the whole interval", () => {
    // The sequence is deterministic, so these bounds hold exactly and the test cannot flake.
    const values = take(createRandom(20261021), 10000);
    const buckets = new Array(10).fill(0);
    let sum = 0;

    for (const value of values) {
      buckets[Math.min(9, Math.floor(value * 10))] += 1;
      sum += value;
    }

    // Every tenth of the interval gets a share close to a tenth of the samples.
    for (const [index, count] of buckets.entries()) {
      assert.ok(count > 800, `bucket ${index} got ${count} samples, expected more than 800`);
      assert.ok(count < 1200, `bucket ${index} got ${count} samples, expected fewer than 1200`);
    }

    const mean = sum / values.length;
    assert.ok(Math.abs(mean - 0.5) < 0.02, `expected a mean near 0.5, got ${mean}`);
  });

  it("does not repeat itself", () => {
    const values = take(createRandom(20261021), 1000);
    const unique = new Set(values);

    assert.equal(unique.size, values.length);
  });
});

describe("pickWeighted", () => {
  it("throws when there are no values", () => {
    assert.throws(() => pickWeighted([], [], createRandom(1)), /at least one value/);
  });

  it("throws when the weights do not match the values", () => {
    assert.throws(() => pickWeighted([2, 4], [1], createRandom(1)), /one weight per value/);
  });

  it("throws when a weight is negative", () => {
    assert.throws(() => pickWeighted([2, 4], [1, -0.5], createRandom(1)), /non-negative/);
  });

  it("throws when every weight is zero", () => {
    assert.throws(() => pickWeighted([2, 4], [0, 0], createRandom(1)), /positive weight/);
  });

  it("always picks the only value when there is one", () => {
    const random = createRandom(3);

    for (let index = 0; index < 20; index += 1) {
      assert.equal(pickWeighted([7], [1], random), 7);
    }
  });

  it("never picks a value with a weight of zero", () => {
    const random = createRandom(3);

    for (let index = 0; index < 50; index += 1) {
      assert.equal(pickWeighted([2, 4], [1, 0], random), 2);
    }
  });

  it("picks according to the weights", () => {
    const random = createRandom(7);
    const counts = { 2: 0, 4: 0 };

    for (let index = 0; index < 10000; index += 1) {
      counts[pickWeighted([2, 4], [0.9, 0.1], random)] += 1;
    }

    // A weight of 0.1 out of 1 should land near 1000 of 10000. The sequence is deterministic, so
    // these bounds hold exactly.
    assert.ok(counts[4] > 800, `expected 4 to be picked often, got ${counts[4]}`);
    assert.ok(counts[4] < 1200, `expected 4 to be picked rarely, got ${counts[4]}`);
    assert.equal(counts[2] + counts[4], 10000);
  });

  it("treats the weights as relative", () => {
    const random = createRandom(11);
    const counts = { 2: 0, 4: 0 };

    for (let index = 0; index < 10000; index += 1) {
      counts[pickWeighted([2, 4], [9, 1], random)] += 1;
    }

    // The same ratio as 0.9 and 0.1 must give the same split.
    assert.ok(counts[4] > 800, `expected 4 to be picked often, got ${counts[4]}`);
    assert.ok(counts[4] < 1200, `expected 4 to be picked rarely, got ${counts[4]}`);
  });

  it("always returns one of the values, even at the top of the range", () => {
    const alwaysOne = () => 0.999999999999;
    const alwaysZero = () => 0;

    assert.ok([2, 4].includes(pickWeighted([2, 4], [0.9, 0.1], alwaysOne)));
    assert.ok([2, 4].includes(pickWeighted([2, 4], [0.9, 0.1], alwaysZero)));
  });
});
