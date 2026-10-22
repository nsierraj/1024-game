import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { STRINGS } from "../../src/ui/strings.js";

describe("a11y", () => {
  it("strings include required announcements and board label", () => {
    assert.ok(STRINGS.boardLabel.includes("4 by 4"));
    assert.ok(STRINGS.emptyCell);
    assert.ok(STRINGS.winAnnouncement);
    assert.ok(STRINGS.gameOverAnnouncement);
  });

  it("index.html has announcer and accessible elements", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    assert.ok(html.includes('id="announcer"'));
    assert.ok(html.includes('role="grid"'));
    assert.ok(html.includes('role="gridcell"'));
  });
});
