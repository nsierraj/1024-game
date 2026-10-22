/**
 * The five sound effects, made from recipes instead of audio files.
 *
 * A recipe is plain data: a few notes, each a pitch with some overtones and a decaying envelope.
 * `renderEffect` turns a recipe into samples. It is pure, so the same code that makes the sound in
 * the browser also runs in the tests, which can then measure what the player will hear: that each
 * effect is audible, different from the others, and free of clicks. (FR-008, FR-009, FR-010)
 *
 * Nothing here touches the DOM or an `AudioContext`. The player's device is never asked to
 * download or decode a file. (FR-013)
 */

/** The level every effect is normalised to, in dB below full scale. (SC-006) */
export const PEAK_DBFS = -9;

/** The fades at the start and the end of an effect, in seconds, so it never begins or ends on a click. */
export const FADE_IN = 0.003;
export const FADE_OUT = 0.012;

/**
 * @typedef {object} Note
 * @property {number} at Seconds from the start of the effect.
 * @property {number} frequency The pitch in hertz.
 * @property {number} [endFrequency] A pitch to glide to.
 * @property {number} [sweep] Seconds the glide takes. Defaults to 0.08.
 * @property {number} [attack] Seconds to rise to full level. Defaults to 0.004.
 * @property {number} decay The time constant of the fall, in seconds.
 * @property {{ratio: number, gain: number}[]} partials The overtones, as multiples of the pitch.
 *
 * @typedef {object} Recipe
 * @property {"move" | "merge" | "undo" | "win" | "gameover"} id
 * @property {number} duration Seconds.
 * @property {number} peak The level to normalise to, in dB below full scale.
 * @property {Note[]} notes
 */

/** A soft tone: the pitch and a quiet octave above it. */
const SOFT = [
  { ratio: 1, gain: 1 },
  { ratio: 2, gain: 0.25 },
];

/** @type {Readonly<Record<string, Recipe>>} */
export const RECIPES = Object.freeze({
  // A light tap: a short, falling pitch with a touch of overtone.
  move: {
    id: "move",
    duration: 0.12,
    peak: PEAK_DBFS,
    notes: [
      {
        at: 0,
        frequency: 520,
        endFrequency: 380,
        sweep: 0.08,
        decay: 0.03,
        partials: [
          { ratio: 1, gain: 1 },
          { ratio: 2.3, gain: 0.25 },
        ],
      },
    ],
  },

  // A warm two-note chime: a third apart, the second note landing as the first fades.
  merge: {
    id: "merge",
    duration: 0.36,
    peak: PEAK_DBFS,
    notes: [
      { at: 0, frequency: 659, decay: 0.09, partials: SOFT },
      { at: 0.07, frequency: 880, decay: 0.12, partials: SOFT },
    ],
  },

  // A soft reverse-tap: the pitch rises as the sound swells and then stops.
  undo: {
    id: "undo",
    duration: 0.14,
    peak: PEAK_DBFS,
    notes: [
      {
        at: 0,
        frequency: 380,
        endFrequency: 520,
        sweep: 0.1,
        attack: 0.06,
        decay: 0.025,
        partials: [
          { ratio: 1, gain: 1 },
          { ratio: 2, gain: 0.15 },
        ],
      },
    ],
  },

  // A rising flourish: four notes of a major chord, climbing.
  win: {
    id: "win",
    duration: 0.85,
    peak: PEAK_DBFS,
    notes: [
      { at: 0, frequency: 523, decay: 0.22, partials: [...SOFT, { ratio: 3, gain: 0.1 }] },
      { at: 0.09, frequency: 659, decay: 0.22, partials: [...SOFT, { ratio: 3, gain: 0.1 }] },
      { at: 0.18, frequency: 784, decay: 0.22, partials: [...SOFT, { ratio: 3, gain: 0.1 }] },
      { at: 0.27, frequency: 1047, decay: 0.3, partials: [...SOFT, { ratio: 3, gain: 0.1 }] },
    ],
  },

  // A soft falling tone: three notes stepping down, almost pure.
  gameover: {
    id: "gameover",
    duration: 0.75,
    peak: PEAK_DBFS,
    notes: [
      { at: 0, frequency: 392, decay: 0.18, partials: [{ ratio: 1, gain: 1 }, { ratio: 2, gain: 0.12 }] },
      { at: 0.13, frequency: 330, decay: 0.18, partials: [{ ratio: 1, gain: 1 }, { ratio: 2, gain: 0.12 }] },
      { at: 0.26, frequency: 262, decay: 0.28, partials: [{ ratio: 1, gain: 1 }, { ratio: 2, gain: 0.12 }] },
    ],
  },
});

/** The ids of the effects, in a fixed order. */
export const EFFECT_IDS = Object.freeze(["move", "merge", "undo", "win", "gameover"]);

/**
 * The phase of a note at a given age, in radians, for a pitch that may glide.
 * @param {Note} note
 * @param {number} age Seconds since the note began.
 * @returns {number}
 */
function phaseAt(note, age) {
  const start = note.frequency;
  const end = note.endFrequency ?? note.frequency;
  const sweep = note.sweep ?? 0.08;
  if (end === start) return 2 * Math.PI * start * age;
  if (age <= sweep) return 2 * Math.PI * (start * age + ((end - start) * age * age) / (2 * sweep));
  // Past the glide the pitch stays at its end value.
  const atSweepEnd = start * sweep + ((end - start) * sweep) / 2;
  return 2 * Math.PI * (atSweepEnd + end * (age - sweep));
}

/**
 * The level of a note at a given age: a quick rise, then an exponential fall.
 * @param {Note} note
 * @param {number} age
 * @returns {number}
 */
function envelopeAt(note, age) {
  const attack = note.attack ?? 0.004;
  if (age < attack) return age / attack;
  return Math.exp(-(age - attack) / note.decay);
}

/**
 * Renders a recipe into mono samples, normalised so the largest sample sits at the recipe's peak.
 *
 * @param {Recipe} recipe
 * @param {number} [sampleRate] Samples per second. Use the audio context's own rate.
 * @returns {Float32Array}
 */
export function renderEffect(recipe, sampleRate = 44100) {
  const length = Math.round(recipe.duration * sampleRate);
  const samples = new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    const time = i / sampleRate;
    let value = 0;
    for (const note of recipe.notes) {
      const age = time - note.at;
      if (age < 0) continue;
      const envelope = envelopeAt(note, age);
      const phase = phaseAt(note, age);
      for (const partial of note.partials) value += partial.gain * envelope * Math.sin(phase * partial.ratio);
    }
    samples[i] = value;
  }

  // Fade in and out first, so the normalisation sees the shape that will actually be heard.
  const fadeIn = Math.max(1, Math.round(FADE_IN * sampleRate));
  const fadeOut = Math.max(1, Math.round(FADE_OUT * sampleRate));
  for (let i = 0; i < fadeIn && i < length; i += 1) samples[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut && i < length; i += 1) samples[length - 1 - i] *= i / fadeOut;

  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const scale = peak > 0 ? 10 ** (recipe.peak / 20) / peak : 0;
  for (let i = 0; i < length; i += 1) samples[i] *= scale;

  return samples;
}
