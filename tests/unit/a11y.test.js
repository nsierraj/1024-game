import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createAnnouncer } from "../../src/ui/a11y.js";
import { cellText } from "../../src/ui/render.js";
import { STRINGS } from "../../src/ui/strings.js";

/**
 * A stand-in for the live region that keeps every message written to it.
 * @returns {{textContent: string, history: string[]}}
 */
function fakeRegion() {
  const history = [];
  let text = "";
  return {
    history,
    get textContent() {
      return text;
    },
    set textContent(value) {
      text = value;
      history.push(value);
    },
  };
}

/**
 * A clock the test moves by hand.
 * @returns {{now: () => number, advance: (ms: number) => void}}
 */
function fakeClock() {
  let time = 1000;
  return {
    now: () => time,
    advance(ms) {
      time += ms;
    },
  };
}

function readHtml() {
  return readFileSync(join(process.cwd(), "index.html"), "utf8");
}

describe("a11y strings", () => {
  it("strings include required announcements and board label", () => {
    assert.ok(STRINGS.boardLabel.includes("4 by 4"));
    assert.equal(STRINGS.emptyCell, "empty");
    assert.ok(STRINGS.winAnnouncement);
    assert.equal(typeof STRINGS.gameOverAnnouncement(120), "string");
    assert.equal(typeof STRINGS.undoAnnouncement(40), "string");
  });

  it("index.html has the live region and the grid semantics", () => {
    const html = readHtml();
    assert.match(html, /<div id="status-region"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.ok(html.includes('role="grid"'));
    assert.ok(html.includes('role="gridcell"'));
  });

  it("index.html keeps the score-gain indicator out of the live regions (FR-018, FR-051)", () => {
    const html = readHtml();
    const gain = html.match(/<div id="score-gain"[^>]*>/)[0];
    assert.ok(gain.includes('aria-hidden="true"'));
    assert.ok(!gain.includes("aria-live"));
  });
});

describe("board cell text (FR-050, FR-052)", () => {
  it("reads an occupied cell as its value and an empty cell as the word empty", () => {
    assert.equal(cellText(0), "empty");
    assert.equal(cellText(2), "2");
    assert.equal(cellText(2048), "2048");
  });

  it("gives the page sixteen grid cells in four rows", () => {
    const html = readHtml();
    assert.equal((html.match(/role="row"/g) || []).length, 4);
    assert.equal((html.match(/role="gridcell"/g) || []).length, 16);
  });
});

describe("page shell and STRINGS do not drift (T060)", () => {
  const html = readHtml();

  /** The static copy of the interface in index.html, and the string it must match. */
  const STATIC_COPY = [
    "boardLabel",
    "helpGoalText",
    "helpControlsText",
    "helpInstallText",
    "winTitle",
    "winBody",
    "winKeepPlaying",
    "winNewGame",
    "gameOverTitle",
    "gameOverBody",
    "gameOverNewGame",
    "gameOverUndo",
    "confirmTitle",
    "confirmBody",
    "confirmStart",
    "confirmCancel",
  ];

  for (const key of STATIC_COPY) {
    it(`index.html carries the text of STRINGS.${key}`, () => {
      const squashed = html.replace(/\s+/g, " ");
      assert.ok(squashed.includes(STRINGS[key]), `"${STRINGS[key]}" is not in index.html`);
    });
  }
});

describe("zoom (FR-054, FR-055)", () => {
  it("does not stop the player from zooming the page", () => {
    const viewport = readHtml().match(/<meta\s+name="viewport"\s+content="([^"]*)"/)[1];
    assert.ok(!/user-scalable\s*=\s*(no|0)/.test(viewport), viewport);
    const max = viewport.match(/maximum-scale\s*=\s*([\d.]+)/);
    assert.ok(!max || Number(max[1]) >= 5, viewport);
  });

  it("keeps a swipe on the board from scrolling or zooming it instead (FR-013)", () => {
    const css = readFileSync(join(process.cwd(), "src/styles/board.css"), "utf8");
    assert.match(css, /touch-action:\s*none/);
  });
});

describe("createAnnouncer (FR-051)", () => {
  it("announces the points and the score after a merge", () => {
    const region = fakeRegion();
    createAnnouncer(region).announceMove(16, 40);

    assert.equal(region.textContent, "Merged 16. Score 40.");
  });

  it("says nothing for a move that merged nothing", () => {
    const region = fakeRegion();
    createAnnouncer(region).announceMove(0, 40);

    assert.deepEqual(region.history, []);
  });

  it("throttles a fast run of merges but not the next merge after the pause", () => {
    const region = fakeRegion();
    const clock = fakeClock();
    const announcer = createAnnouncer(region, { now: clock.now, throttleMs: 500 });

    announcer.announceMove(4, 4);
    clock.advance(100);
    announcer.announceMove(8, 12);
    assert.equal(region.history.length, 1);

    clock.advance(500);
    announcer.announceMove(16, 28);
    assert.equal(region.textContent, "Merged 16. Score 28.");
  });

  it("announces the win and the game over without throttling", () => {
    const region = fakeRegion();
    const clock = fakeClock();
    const announcer = createAnnouncer(region, { now: clock.now });

    announcer.announceMove(512, 1024);
    announcer.announceWin();
    assert.equal(region.textContent, STRINGS.winAnnouncement);

    announcer.announceGameOver(120);
    assert.equal(region.textContent, STRINGS.gameOverAnnouncement(120));
  });

  it("announces an undo with the restored score", () => {
    const region = fakeRegion();
    createAnnouncer(region).announceUndo(40);

    assert.equal(region.textContent, STRINGS.undoAnnouncement(40));
  });

  it("changes the text when the same message is announced twice, so it is read again", () => {
    const region = fakeRegion();
    const announcer = createAnnouncer(region);

    announcer.announceGameOver(120);
    const first = region.textContent;
    announcer.announceGameOver(120);

    assert.notEqual(region.textContent, first);
    assert.equal(region.textContent.trim(), first.trim());
  });

  it("does nothing when the page has no live region", () => {
    const announcer = createAnnouncer(null);

    announcer.announceMove(4, 4);
    announcer.announceWin();
    announcer.announceGameOver(4);
    announcer.announceUndo(4);
  });
});

describe("the new design keeps every control and target (FR-019)", () => {
  const CONTROL_IDS = [
    "new-game",
    "undo",
    "help-toggle",
    "theme-select",
    "sound-toggle",
    "win-keep-playing",
    "win-new-game",
    "gameover-undo",
    "gameover-new-game",
    "confirm-start",
    "confirm-cancel",
  ];

  for (const id of CONTROL_IDS) {
    it(`index.html still has #${id}`, () => {
      assert.ok(readHtml().includes(`id="${id}"`), `#${id} is gone`);
    });
  }

  it("sizes buttons and the selector from a token of at least 24 pixels", () => {
    const base = readFileSync(join(process.cwd(), "src/styles/base.css"), "utf8");
    const size = Number(base.match(/--control-size:\s*(\d+)px/)[1]);
    assert.ok(size >= 24, `--control-size is ${size}px`);
    assert.match(base, /\.btn,\s*\n\.select\s*\{[^}]*min-height:\s*var\(--control-size\)/);
    assert.match(base, /\.btn,\s*\n\.select\s*\{[^}]*min-width:\s*var\(--control-size\)/);
  });
});

