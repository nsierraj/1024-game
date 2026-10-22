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
});
