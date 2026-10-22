import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createInput } from "../../src/ui/input.js";

/**
 * A stand-in for the element the keys are listened for on.
 *
 * The module takes its target and its blocker as arguments, so it can be driven without a
 * browser.
 *
 * @returns {{
 *   press: (key: string, extra?: object) => object,
 *   handlers: { type: string, handler: (event: object) => void }[]
 * }}
 */
function fakeTarget() {
  const handlers = [];

  return {
    handlers,
    addEventListener(type, handler) {
      handlers.push({ type, handler });
    },
    removeEventListener(type, handler) {
      const index = handlers.findIndex((entry) => entry.type === type && entry.handler === handler);
      if (index >= 0) handlers.splice(index, 1);
    },
    press(key, extra = {}) {
      const event = {
        key,
        defaultPrevented: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        target: null,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...extra,
      };

      for (const entry of handlers) {
        if (entry.type === "keydown") entry.handler(event);
      }
      return event;
    },
  };
}

describe("createInput", () => {
  it("slides the board with the four arrow keys", () => {
    const directions = [];
    const target = fakeTarget();
    const input = createInput({ target, onMove: (direction) => directions.push(direction) });

    for (const [key, direction] of [
      ["ArrowUp", "up"],
      ["ArrowDown", "down"],
      ["ArrowLeft", "left"],
      ["ArrowRight", "right"],
    ]) {
      target.press(key);
      input.release();
      assert.equal(directions[directions.length - 1], direction);
    }

    assert.deepEqual(directions, ["up", "down", "left", "right"]);
  });

  it("ignores keys that are not directions", () => {
    const directions = [];
    const target = fakeTarget();
    createInput({ target, onMove: (direction) => directions.push(direction) });

    target.press("a");
    target.press("Enter");
    target.press(" ");
    target.press("Escape");

    assert.deepEqual(directions, []);
  });

  it("takes the key away from the page so the board does not scroll", () => {
    const target = fakeTarget();
    createInput({ target, onMove: () => {} });

    assert.equal(target.press("ArrowDown").defaultPrevented, true);
    assert.equal(target.press("a").defaultPrevented, false);
  });

  it("leaves the arrow keys to a control that uses them itself", () => {
    const directions = [];
    const target = fakeTarget();
    createInput({ target, onMove: (direction) => directions.push(direction) });

    const control = {
      closest: (selector) => (selector.includes("select") ? {} : null),
    };
    target.press("ArrowDown", { target: control });

    assert.deepEqual(directions, []);
  });

  it("leaves the arrow keys alone when a modifier is held", () => {
    const directions = [];
    const target = fakeTarget();
    createInput({ target, onMove: (direction) => directions.push(direction) });

    target.press("ArrowDown", { altKey: true });
    target.press("ArrowDown", { ctrlKey: true });
    target.press("ArrowDown", { metaKey: true });

    assert.deepEqual(directions, []);
  });

  it("does not act on the keyboard while a dialog is open", () => {
    const directions = [];
    const target = fakeTarget();
    let blocked = true;
    createInput({
      target,
      onMove: (direction) => directions.push(direction),
      isBlocked: () => blocked,
    });

    target.press("ArrowLeft");
    assert.deepEqual(directions, []);

    blocked = false;
    target.press("ArrowLeft");
    assert.deepEqual(directions, ["left"]);
  });

  it("queues the input that arrives while a move is running", () => {
    // Input that arrives during an animation must not be lost. (FR-064)
    const directions = [];
    const target = fakeTarget();
    const input = createInput({ target, onMove: (direction) => directions.push(direction) });

    target.press("ArrowLeft");
    target.press("ArrowUp");
    target.press("ArrowRight");

    // Only the first move has been made, because the first one has not finished yet.
    assert.deepEqual(directions, ["left"]);
    assert.equal(input.pending, 2);

    input.release();

    assert.deepEqual(directions, ["left", "up"]);
    assert.equal(input.pending, 1);

    input.release();

    assert.deepEqual(directions, ["left", "up", "right"]);
    assert.equal(input.pending, 0);
  });

  it("keeps the order of the queued moves", () => {
    const directions = [];
    const target = fakeTarget();
    const input = createInput({ target, onMove: (direction) => directions.push(direction) });

    for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
      target.press(key);
    }

    input.release();
    input.release();
    input.release();

    assert.deepEqual(directions, ["up", "down", "left", "right"]);
  });

  it("waits for the dialog to close before it plays the queue", () => {
    const directions = [];
    const target = fakeTarget();
    let blocked = false;
    const input = createInput({
      target,
      onMove: (direction) => directions.push(direction),
      isBlocked: () => blocked,
    });

    target.press("ArrowLeft");
    target.press("ArrowUp");
    assert.deepEqual(directions, ["left"]);

    // A dialog opens while the first move is still running.
    blocked = true;
    input.release();

    assert.deepEqual(directions, ["left"]);

    blocked = false;
    input.release();

    assert.deepEqual(directions, ["left", "up"]);
  });

  it("stops listening once it is destroyed", () => {
    const directions = [];
    const target = fakeTarget();
    const input = createInput({ target, onMove: (direction) => directions.push(direction) });

    input.destroy();
    target.press("ArrowLeft");

    assert.deepEqual(directions, []);
  });
});
