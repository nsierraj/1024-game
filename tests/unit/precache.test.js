import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("precache", () => {
  it("PRECACHE_ASSETS in sw.js lists paths that all exist on disk", () => {
    const swPath = join(process.cwd(), "sw.js");
    const content = readFileSync(swPath, "utf8");
    const match = content.match(/PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(match, "PRECACHE_ASSETS not found");
    const arrayContent = match[1];
    const assets = Array.from(arrayContent.matchAll(/["']([^"']+)["']/g)).map((m) => m[1]);
    assert.ok(assets.length > 0, "no assets listed");
    for (const asset of assets) {
      const rel = asset.replace(/^\.\//, "");
      const fullPath = join(process.cwd(), rel);
      assert.ok(existsSync(fullPath), `precache asset missing: ${asset}`);
    }
  });

  it("precaches the sound synthesiser, so sound works offline from the first time it is turned on (FR-040)", () => {
    const content = readFileSync(join(process.cwd(), "sw.js"), "utf8");
    const match = content.match(/PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(match, "PRECACHE_ASSETS not found");
    assert.ok(match[1].includes("./src/services/sound-synth.js"), "sound-synth.js is not precached");
  });

  it("lists no audio file anywhere, because there are none (FR-013)", () => {
    const content = readFileSync(join(process.cwd(), "sw.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!/\.mp3|assets\/audio/.test(content), "sw.js refers to an audio file");
    assert.ok(!existsSync(join(process.cwd(), "assets/audio")), "assets/audio still exists");
  });

  it("precaches every module the audio service imports", () => {
    const audio = readFileSync(join(process.cwd(), "src/services/audio.js"), "utf8");
    const content = readFileSync(join(process.cwd(), "sw.js"), "utf8");
    for (const [, path] of audio.matchAll(/from "\.\/([a-z-]+\.js)"/g)) {
      assert.ok(content.includes(`./src/services/${path}`), `${path} is imported by audio.js but not precached`);
    }
  });

  it("never skips waiting on its own (FR-061)", () => {
    const content = readFileSync(join(process.cwd(), "sw.js"), "utf8");
    const code = content.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!code.includes("skipWaiting"));
  });
});
