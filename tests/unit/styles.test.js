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
});
