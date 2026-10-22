/**
 * Lazy-loaded sound effects.
 * Audio files are fetched only on first enable. (FR-038, FR-039)
 */

const EFFECTS = ["move", "merge", "win", "gameover"];

export function createAudio() {
  let enabled = false;
  let loaded = false;
  let loading = null;
  const buffers = new Map();
  let ctx = null;

  async function load() {
    if (loaded) return true;
    if (loading) return loading;
    loading = (async () => {
      try {
        const AudioContextClass = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
        if (!AudioContextClass) return false;
        ctx = new AudioContextClass();
        const base = "./assets/audio/";
        for (const name of EFFECTS) {
          try {
            const res = await fetch(`${base}${name}.mp3`);
            if (!res.ok) continue;
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            buffers.set(name, audioBuffer);
          } catch {
            // skip failed
          }
        }
        loaded = buffers.size > 0;
        return loaded;
      } catch {
        return false;
      }
    })();
    return loading;
  }

  return {
    async enable() {
      const ok = await load();
      if (!ok) {
        enabled = false;
        return false;
      }
      enabled = true;
      if (ctx && ctx.state === "suspended") {
        try { await ctx.resume(); } catch {}
      }
      return true;
    },
    disable() {
      enabled = false;
    },
    isEnabled() {
      return enabled;
    },
    async play(name) {
      if (!enabled) return;
      if (!loaded) {
        const ok = await load();
        if (!ok) return;
      }
      if (!buffers.has(name)) return;
      try {
        if (ctx && ctx.state === "suspended") await ctx.resume();
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.value = 0.3;
        source.buffer = buffers.get(name);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
      } catch {
        // ignore
      }
    },
  };
}
