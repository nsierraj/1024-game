import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDialogs } from "../../src/ui/dialogs.js";

/**
 * A stand-in for a native dialog.
 * @returns {object}
 */
function fakeDialog() {
  const listeners = new Map();

  return {
    open: false,
    showModalCalls: 0,
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
function setup() {
  const win = { dialog: fakeDialog(), keepPlaying: fakeButton(), newGame: fakeButton() };
  const gameover = {
    dialog: fakeDialog(),
    score: { textContent: "" },
    undo: fakeButton(),
    newGame: fakeButton(),
  };
  const confirm = { dialog: fakeDialog(), start: fakeButton(), cancel: fakeButton() };

  return { win, gameover, confirm, dialogs: createDialogs({ win, gameover, confirm }) };
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
