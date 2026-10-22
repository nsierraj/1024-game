import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const STYLESHEETS = ["base", "board", "themes"].map((name) => `src/styles/${name}.css`);

/**
 * @param {string} relativePath
 * @returns {string} the file's text
 */
function read(relativePath) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

/**
 * @param {string} css
 * @returns {string} the stylesheet without its comments
 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("styles", () => {
  for (const path of STYLESHEETS) {
    it(`${path} has balanced braces`, () => {
      const css = stripComments(read(path));
      const opened = css.split("{").length - 1;
      const closed = css.split("}").length - 1;
      assert.equal(opened, closed, `${opened} "{" against ${closed} "}"`);
    });
  }

  it("every class used in index.html has a rule in a stylesheet", () => {
    const html = read("index.html");
    const used = new Set(
      Array.from(html.matchAll(/class="([^"]+)"/g)).flatMap((match) => match[1].split(/\s+/)),
    );
    const css = STYLESHEETS.map((path) => stripComments(read(path))).join("\n");
    const defined = new Set(Array.from(css.matchAll(/\.([a-zA-Z][\w-]*)/g)).map((match) => match[1]));
    const unstyled = Array.from(used).filter((name) => !defined.has(name));
    assert.deepEqual(unstyled, [], `classes with no CSS rule: ${unstyled.join(", ")}`);
  });

  describe("controls (FR-016, FR-025)", () => {
    const css = STYLESHEETS.map((path) => stripComments(read(path))).join("\n");

    for (const control of [".btn", ".select"]) {
      it(`${control} has a hover, a pressed, and a keyboard-focus state`, () => {
        assert.match(css, new RegExp(`${control.replace(".", "\\.")}:hover`), "no hover rule");
        assert.match(css, new RegExp(`${control.replace(".", "\\.")}:active`), "no pressed rule");
      });
    }

    it("shows a focus ring for the keyboard and never removes it", () => {
      assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--focus-ring\)/);
      assert.ok(!/outline:\s*(none|0)\b/.test(css), "a rule removes the outline");
    });

    it("loads no font, image, or stylesheet from another origin", () => {
      assert.ok(!/@import|@font-face/.test(css), "an @import or @font-face is declared");
      assert.ok(!/url\(\s*["']?(https?:|\/\/|data:)/.test(css), "a url() points off the page");
    });

    it("styles the dialogs entering, and leaving through data-closing", () => {
      assert.match(css, /dialog\[open\]|\.modal\[open\]/);
      assert.match(css, /\[data-closing\]/);
    });
  });
});
