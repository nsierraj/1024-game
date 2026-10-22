import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDialogs, LEAVE_MS } from "../../src/ui/dialogs.js";

/**
 * A stand-in for a native dialog.
 * @returns {object}
 */
function fakeDialog() {
  const listeners = new Map();

  const attributes = new Map();

  return {
    open: false,
    showModalCalls: 0,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    hasAttribute: (name) => attributes.has(name),
    showModal() {
      this.open = true;
      this.showModalCalls += 1;
    },
    close() {
      this.open = false;
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatch(type, extra = {}) {
      const event = {
        type,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...extra,
      };
      for (const handler of listeners.get(type) || []) handler(event);
      return event;
    },
  };
}

/**
 * A stand-in for a button.
 * @returns {object}
 */
function fakeButton() {
  const handlers = [];

  return {
    clicks: 0,
    addEventListener(type, handler) {
      if (type === "click") handlers.push(handler);
    },
    click() {
      this.clicks += 1;
      for (const handler of handlers) handler({ type: "click" });
    },
  };
}

/**
 * The three dialogs, wired up.
 * @returns {{win: object, gameover: object, confirm: object, dialogs: object}}
 */
function setup(options = {}) {
  const win = { dialog: fakeDialog(), keepPlaying: fakeButton(), newGame: fakeButton() };
  const gameover = {
    dialog: fakeDialog(),
    score: { textContent: "" },
    undo: fakeButton(),
    newGame: fakeButton(),
  };
  const confirm = { dialog: fakeDialog(), start: fakeButton(), cancel: fakeButton() };

  // By default a dialog leaves at once, so the tests of what each button does need no waiting. The
  // tests of the leave transition pass their own scheduler.
  const dialogs = createDialogs({ win, gameover, confirm, schedule: (run) => run(), reducedMotion: () => false, ...options });
  return { win, gameover, confirm, dialogs };
}

describe("createDialogs", () => {
  it("opens the win dialog with the two choices the rules ask for", () => {
    const { win, dialogs } = setup();
    const chosen = [];

    dialogs.showWin({
      keepPlaying: () => chosen.push("keepPlaying"),
      newGame: () => chosen.push("newGame"),
    });

    assert.equal(win.dialog.open, true);
    assert.equal(win.dialog.showModalCalls, 1);

    win.keepPlaying.click();
    assert.deepEqual(chosen, ["keepPlaying"]);

    dialogs.showWin({
      keepPlaying: () => chosen.push("keepPlaying"),
      newGame: () => chosen.push("newGame"),
    });
    win.newGame.click();
    assert.deepEqual(chosen, ["keepPlaying", "newGame"]);
  });

  it("closes the win dialog once the player has chosen", () => {
    const { win, dialogs } = setup();

    dialogs.showWin({});
    win.keepPlaying.click();

    assert.equal(win.dialog.open, false);
  });

  it("carries on when the win message is dismissed rather than answered", () => {
    const { win, dialogs } = setup();
    const chosen = [];

    dialogs.showWin({
      keepPlaying: () => chosen.push("keepPlaying"),
      dismissed: () => chosen.push("dismissed"),
    });

    const event = win.dialog.dispatch("cancel");

    assert.deepEqual(chosen, ["dismissed"]);
    assert.equal(win.dialog.open, false);
    assert.equal(event.defaultPrevented, true);
  });

  it("shows the final score in the game-over dialog", () => {
    const { gameover, dialogs } = setup();

    dialogs.showGameOver({ score: 120 });

    assert.equal(gameover.score.textContent, "120");
    assert.equal(gameover.dialog.open, true);
  });

  it("offers a way to try again when the game is over", () => {
    const { gameover, dialogs } = setup();
    const chosen = [];

    dialogs.showGameOver({
      score: 0,
      newGame: () => chosen.push("newGame"),
    });
    gameover.newGame.click();

    assert.deepEqual(chosen, ["newGame"]);
    assert.equal(gameover.dialog.open, false);
  });

  it("offers the undo from the game-over dialog, without a keyboard (FR-028)", () => {
    const { gameover, dialogs } = setup();
    const chosen = [];

    dialogs.showGameOver({
      score: 0,
      undo: () => chosen.push("undo"),
      newGame: () => chosen.push("newGame"),
    });
    gameover.undo.click();

    assert.deepEqual(chosen, ["undo"]);
    assert.equal(gameover.dialog.open, false);
  });

  it("closes the game-over dialog when it is dismissed", () => {
    const { gameover, dialogs } = setup();
    const chosen = [];

    dialogs.showGameOver({ score: 0, dismissed: () => chosen.push("dismissed") });
    gameover.dialog.dispatch("cancel");

    assert.deepEqual(chosen, ["dismissed"]);
    assert.equal(gameover.dialog.open, false);
  });

  it("asks before a new game starts", () => {
    const { confirm, dialogs } = setup();
    const chosen = [];

    dialogs.showConfirm({
      confirm: () => chosen.push("confirm"),
      cancel: () => chosen.push("cancel"),
    });

    assert.equal(confirm.dialog.open, true);

    confirm.start.click();
    assert.deepEqual(chosen, ["confirm"]);
    assert.equal(confirm.dialog.open, false);
  });

  it("keeps the current game when the confirmation is declined", () => {
    const { confirm, dialogs } = setup();
    const chosen = [];

    dialogs.showConfirm({
      confirm: () => chosen.push("confirm"),
      cancel: () => chosen.push("cancel"),
    });
    confirm.cancel.click();

    assert.deepEqual(chosen, ["cancel"]);
    assert.equal(confirm.dialog.open, false);
  });

  it("treats Escape on the confirmation as a decline", () => {
    const { confirm, dialogs } = setup();
    const chosen = [];

    dialogs.showConfirm({
      confirm: () => chosen.push("confirm"),
      cancel: () => chosen.push("cancel"),
    });

    const event = confirm.dialog.dispatch("cancel");

    assert.deepEqual(chosen, ["cancel"]);
    assert.equal(confirm.dialog.open, false);
    assert.equal(event.defaultPrevented, true);
  });

  it("says whether a dialog is open", () => {
    const { win, dialogs } = setup();

    assert.equal(dialogs.isOpen(), false);

    dialogs.showWin({});
    assert.equal(dialogs.isOpen(), true);

    win.keepPlaying.click();
    assert.equal(dialogs.isOpen(), false);
  });
});

describe("the leave transition (FR-017, FR-007)", () => {
  /** A scheduler the test runs by hand. */
  function manualScheduler() {
    const queued = [];
    return {
      schedule: (run, ms) => queued.push({ run, ms }),
      queued,
      flush() {
        while (queued.length) queued.shift().run();
      },
    };
  }

  it("plays the leave for 120 ms before closing and before the handler runs", () => {
    const clock = manualScheduler();
    const { win, dialogs } = setup({ schedule: clock.schedule });
    const chosen = [];

    dialogs.showWin({ keepPlaying: () => chosen.push("keepPlaying") });
    win.keepPlaying.click();

    assert.equal(LEAVE_MS, 120);
    assert.equal(clock.queued[0].ms, LEAVE_MS);
    assert.equal(win.dialog.hasAttribute("data-closing"), true);
    assert.equal(win.dialog.open, true, "closed before the leave finished");
    assert.deepEqual(chosen, [], "the handler ran before the dialog closed");

    clock.flush();

    assert.equal(win.dialog.open, false);
    assert.equal(win.dialog.hasAttribute("data-closing"), false);
    assert.deepEqual(chosen, ["keepPlaying"]);
  });

  it("still counts as open while it is leaving, so queued moves wait for the real close", () => {
    const clock = manualScheduler();
    const { win, dialogs } = setup({ schedule: clock.schedule });

    dialogs.showWin({});
    win.keepPlaying.click();
    assert.equal(dialogs.isOpen(), true);

    clock.flush();
    assert.equal(dialogs.isOpen(), false);
  });

  it("ignores a second click while the dialog is leaving, so a double click cannot start two games", () => {
    const clock = manualScheduler();
    const { win, dialogs } = setup({ schedule: clock.schedule });
    const chosen = [];

    dialogs.showWin({ newGame: () => chosen.push("newGame") });
    win.newGame.click();
    win.newGame.click();
    clock.flush();

    assert.deepEqual(chosen, ["newGame"]);
  });

  it("leaves the same way when dismissed with Escape", () => {
    const clock = manualScheduler();
    const { confirm, dialogs } = setup({ schedule: clock.schedule });
    const chosen = [];

    dialogs.showConfirm({ cancel: () => chosen.push("cancel") });
    const event = confirm.dialog.dispatch("cancel");

    assert.equal(event.defaultPrevented, true);
    assert.equal(confirm.dialog.open, true);
    clock.flush();
    assert.deepEqual(chosen, ["cancel"]);
    assert.equal(confirm.dialog.open, false);
  });

  it("closes at once and runs the handler at once when reduced motion is on (FR-007)", () => {
    const clock = manualScheduler();
    const { win, dialogs } = setup({ schedule: clock.schedule, reducedMotion: () => true });
    const chosen = [];

    dialogs.showWin({ keepPlaying: () => chosen.push("keepPlaying") });
    win.keepPlaying.click();

    assert.equal(clock.queued.length, 0, "scheduled a wait under reduced motion");
    assert.equal(win.dialog.open, false);
    assert.deepEqual(chosen, ["keepPlaying"]);
  });

  it("can be opened again after it has left", () => {
    const clock = manualScheduler();
    const { win, dialogs } = setup({ schedule: clock.schedule });

    dialogs.showWin({});
    win.keepPlaying.click();
    clock.flush();
    dialogs.showWin({});

    assert.equal(win.dialog.open, true);
    assert.equal(win.dialog.hasAttribute("data-closing"), false);
  });
});

