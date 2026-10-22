/**
 * The seeded random number generator the logic core uses.
 *
 * The core never calls `Math.random` directly. Every source of randomness arrives as a
 * {@link RandomSource}, so a test can pin the sequence and replay the same game every time.
 */

/**
 * Creates a seeded pseudo-random number generator.
 *
 * The generator is mulberry32: a small, well-distributed 32-bit generator. It is seeded with an
 * unsigned 32-bit integer and yields floats in [0, 1).
 *
 * @param {number} seed The seed. Any finite number is accepted; it is reduced to an unsigned
 *   32-bit integer, so `-1` and `4294967295` are the same seed.
 * @returns {() => number} A function that returns the next value in the sequence.
 */
export function createRandom(seed) {
  let state = Number(seed) >>> 0;

  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks one value from a list of values, weighted.
 *
 * The weights are relative: they do not have to add up to 1. The last value takes whatever weight
 * is left over, so a rounding error in the weights cannot leave the pick without a result.
 *
 * @param {readonly number[]} values The values to pick from.
 * @param {readonly number[]} weights The weight of each value, in the same order.
 * @param {() => number} random The source of randomness.
 * @returns {number} The chosen value.
 */
export function pickWeighted(values, weights, random) {
  if (values.length === 0) {
    throw new Error("pickWeighted needs at least one value");
  }
  if (values.length !== weights.length) {
    throw new Error("pickWeighted needs one weight per value");
  }

  let total = 0;
  for (const weight of weights) {
    if (!(weight >= 0)) {
      throw new Error("pickWeighted needs non-negative weights");
    }
    total += weight;
  }
  if (total <= 0) {
    throw new Error("pickWeighted needs at least one positive weight");
  }

  let threshold = random() * total;
  for (let index = 0; index < values.length; index += 1) {
    threshold -= weights[index];
    if (threshold < 0) {
      return values[index];
    }
  }

  // Only reachable through floating-point rounding, but the pick still has to be one of the
  // values rather than undefined.
  return values[values.length - 1];
}
