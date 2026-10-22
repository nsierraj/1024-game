/**
 * Sound effects.
 *
 * The effects are made by `sound-synth.js` and played through one Web Audio context. This module
 * owns the context and the state of the sound, and its one rule is that the state says "on" only
 * when sound can really come out. (FR-014)
 *
 * Browsers, and WebKit above all, only start audio inside a user gesture. So the context is created
 * and `resume()` is called synchronously inside the gesture, with nothing awaited before it and no
 * error swallowed. WebKit then settles `resume()` on a later tick, so the result is read from the
 * promise and from `statechange`, never from the state straight after the call.
 *
 * States: "off" (sound is disabled), "arming" (asked for, not yet running), "on" (running, effects
 * ready), "suspended" (wanted but not running: restored from a saved choice, blocked, or interrupted).
 */

import { EFFECT_IDS, RECIPES, renderEffect } from "./sound-synth.js";

/** The most effects that may sound at once. */
const MAX_VOICES = 3;

/** A merge this soon after the last one replaces it instead of layering on top, in seconds. */
const MERGE_REPLACE_WINDOW = 0.06;

/**
 * The effect an event plays, or null for an event with no sound.
 *
 * Undo never plays the move effect, including an undo made from the game-over dialog. (FR-012)
 *
 * @param {string} event
 * @returns {"move" | "merge" | "undo" | "win" | "gameover" | null}
 */
export function effectFor(event) {
  switch (event) {
    case "move":
      return "move";
    case "merge":
      return "merge";
    case "undo":
    case "undo-from-game-over":
      return "undo";
    case "win":
      return "win";
    case "gameover":
      return "gameover";
    default:
      return null;
  }
}

function defaultContextFactory() {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  return Context ? new Context() : null;
}

/**
 * Creates the audio service.
 *
 * @param {object} [options]
 * @param {() => AudioContext | null} [options.contextFactory] Replaceable so a test can pass a fake.
 * @returns {{
 *   state: () => "off" | "arming" | "on" | "suspended",
 *   onChange: (listener: (state: string) => void) => void,
 *   enable: () => Promise<boolean>,
 *   disable: () => void,
 *   restore: () => void,
 *   unlock: () => void,
 *   play: (id: string) => void
 * }}
 */
export function createAudio({ contextFactory = defaultContextFactory } = {}) {
  let state = "off";
  let ctx = null;
  let master = null;
  let buffers = null;
  let voices = [];
  let lastMerge = null;
  const listeners = new Set();

  function setState(next) {
    if (state === next) return;
    state = next;
    for (const listener of listeners) listener(state);
  }

  /** Copies rendered samples into a buffer at the context's own rate. */
  function toBuffer(samples) {
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    if (typeof buffer.copyToChannel === "function") buffer.copyToChannel(samples, 0);
    else buffer.getChannelData(0).set(samples);
    return buffer;
  }

  /** Renders the effects and builds the output chain. Done once, on the first enable. */
  function prepare() {
    if (buffers) return;
    buffers = {};
    for (const id of EFFECT_IDS) buffers[id] = toBuffer(renderEffect(RECIPES[id], ctx.sampleRate));

    // No compressor: a DynamicsCompressorNode adds make-up gain and acts on the attack of a short
    // sound, which measured from -17 to -6 dBFS across the five effects. A plain gain keeps every
    // effect at the level it was made at, and the voice cap below keeps stacked sounds under full
    // scale (three at once measured -3.4 dBFS). (SC-006)
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }

  /** Starts a silent one-sample sound, which is what WebKit needs to unlock output. */
  function primeOutput() {
    try {
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // A context that cannot prime is caught by the state check below.
    }
  }

  function onContextState() {
    if (!ctx) return;
    if (ctx.state === "running") {
      if (state === "suspended" || state === "arming") setState("on");
    } else if (state === "on") {
      setState("suspended");
    }
  }

  /**
   * Creates the context if needed and asks it to run. Must be called inside a user gesture.
   * @returns {Promise<boolean> | null} Whether sound is running once it settles, or null if there is no audio.
   */
  function start() {
    if (!ctx) {
      ctx = contextFactory();
      if (!ctx) return null;
      if (typeof ctx.addEventListener === "function") ctx.addEventListener("statechange", onContextState);
    }

    let resumed;
    try {
      resumed = ctx.resume();
    } catch {
      resumed = Promise.reject(new Error("resume failed"));
    }
    prepare();
    primeOutput();

    return Promise.resolve(resumed).then(
      () => ctx.state === "running",
      () => false,
    );
  }

  return {
    state: () => state,

    /** Calls the listener with the new state each time it changes. */
    onChange(listener) {
      listeners.add(listener);
    },

    /**
     * Turns sound on at the player's request. Call it synchronously from the gesture.
     * @returns {Promise<boolean>} True if sound is running.
     */
    enable() {
      setState("arming");
      const settled = start();
      if (!settled) {
        setState("off");
        return Promise.resolve(false);
      }
      return settled.then((running) => {
        if (running) setState("on");
        else setState("off");
        return running;
      });
    },

    disable() {
      for (const voice of voices) voice.stop();
      voices = [];
      lastMerge = null;
      setState("off");
    },

    /**
     * Marks sound as wanted after a reload with sound saved on. Nothing is created yet: the context
     * is made inside the first gesture. (FR-014)
     */
    restore() {
      if (state === "off") setState("suspended");
    },

    /**
     * Starts sound that is wanted but not running. Call it synchronously from a gesture. It does
     * nothing when sound is off, and leaves the state alone if the gesture cannot start sound.
     */
    unlock() {
      if (state !== "suspended") return;
      const settled = start();
      if (!settled) return;
      settled.then((running) => {
        if (running) setState("on");
      });
    },

    /**
     * Plays an effect. Does nothing unless sound is on.
     * @param {string} id
     */
    play(id) {
      if (state !== "on" || !buffers || !buffers[id]) return;

      const now = ctx.currentTime;
      if (id === "merge" && lastMerge && now - lastMerge.time < MERGE_REPLACE_WINDOW) lastMerge.voice.stop();

      while (voices.length >= MAX_VOICES) voices.shift().stop();

      try {
        const source = ctx.createBufferSource();
        source.buffer = buffers[id];
        source.connect(master);
        const voice = {
          stop() {
            try {
              source.stop();
            } catch {
              // Already finished.
            }
          },
        };
        source.onended = () => {
          voices = voices.filter((entry) => entry !== voice);
        };
        voices.push(voice);
        if (id === "merge") lastMerge = { time: now, voice };
        source.start(0);
      } catch {
        // A sound that cannot play must never get in the way of the game.
      }
    },
  };
}
