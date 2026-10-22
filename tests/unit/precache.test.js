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

  it("does not precache the sound files, so a player who never enables sound downloads none (FR-040)", () => {
    const content = readFileSync(join(process.cwd(), "sw.js"), "utf8");
    const match = content.match(/PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(match, "PRECACHE_ASSETS not found");
    assert.ok(!/\.mp3|assets\/audio/.test(match[1]), "an audio file is precached");
  });

  it("caches other same-origin requests at runtime, so sound works offline once fetched (FR-040)", () => {
    const content = readFileSync(join(process.cwd(), "sw.js"), "utf8");
    assert.match(content, /cache\.put\(request, copy\)/);
  });

  it("never skips waiting on its own (FR-061)", () => {
    const content = readFileSync(join(process.cwd(), "sw.js"), "utf8");
    const code = content.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!code.includes("skipWaiting"));
  });
});
