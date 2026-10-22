import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * @param {string} relativePath
 * @returns {string} the file's text
 */
function read(relativePath) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

/**
 * @param {string} dir
 * @returns {string[]} every .js file under the directory
 */
function scripts(dir) {
  return readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return scripts(path);
    return entry.name.endsWith(".js") ? [path] : [];
  });
}

const html = read("index.html");

/**
 * The directives of the policy in the page, by name.
 * @returns {Map<string, string[]>}
 */
function policy() {
  const meta = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/);
  assert.ok(meta, "index.html carries no Content-Security-Policy");
  return new Map(
    meta[1]
      .split(";")
      .map((directive) => directive.trim().split(/\s+/))
      .filter((parts) => parts[0])
      .map(([name, ...sources]) => [name, sources]),
  );
}

describe("Content-Security-Policy (Principle V, FR-062)", () => {
  it("falls back to the page's own origin for everything", () => {
    assert.deepEqual(policy().get("default-src"), ["'self'"]);
  });

  it("allows only the page's own origin for scripts, styles, images, sound, requests, and workers", () => {
    for (const name of ["script-src", "style-src", "img-src", "media-src", "connect-src", "manifest-src", "worker-src"]) {
      assert.deepEqual(policy().get(name), ["'self'"], name);
    }
  });

  it("allows no plugin content and no base-URL rewriting", () => {
    assert.deepEqual(policy().get("object-src"), ["'none'"]);
    assert.deepEqual(policy().get("base-uri"), ["'none'"]);
  });

  it("never loosens the policy", () => {
    for (const [name, sources] of policy()) {
      for (const source of sources) {
        assert.ok(!/unsafe|^\*$|^https?:|^data:|^blob:/.test(source), `${name} allows ${source}`);
      }
    }
  });
});

describe("a page the policy can hold (Principle V)", () => {
  it("has no inline script", () => {
    const inline = [...html.matchAll(/<script\b([^>]*)>/g)].filter(([, attributes]) => !/\bsrc=/.test(attributes));
    assert.deepEqual(inline, []);
  });

  it("has no inline style element or style attribute", () => {
    assert.ok(!/<style\b/.test(html));
    assert.ok(!/\sstyle=/.test(html));
  });

  it("has no inline event handler", () => {
    assert.ok(!/\son[a-z]+=/i.test(html));
  });

  it("refers to no other origin", () => {
    assert.ok(!/(?:src|href|action)="(?:https?:)?\/\//.test(html));
  });

  it("builds no markup or code from strings in the source", () => {
    for (const path of scripts("src")) {
      const code = read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      assert.ok(!/\binnerHTML\b|\binsertAdjacentHTML\b|\beval\(|new Function\(|setAttribute\("style"/.test(code), path);
    }
  });
});
