/**
 * Keyboard and pointer input for the board.
 */

import { resolveSwipe } from "./swipe.js";

const DIRECTIONS = new Set(["up", "down", "left", "right"]);

export function createInput({ target, isBlocked, onMove } = {}) {
  const queue = [];
  let down = null;
  let running = false;

  const blockedFn = typeof isBlocked === "function" ? isBlocked : () => false;
  const moveFn = typeof onMove === "function" ? onMove : () => {};

  function isBlockedNow() {
    if (running) return true;
    return blockedFn();
  }

  function tryMove(direction) {
    if (!DIRECTIONS.has(direction)) return;
    if (isBlockedNow()) {
      queue.push(direction);
      return;
    }
    running = true;
    moveFn(direction);
  }

  function onKeyDown(event) {
    const t = event.target;
    if (t && typeof t.closest === "function") {
      if (t.closest("select") || t.closest("input") || t.closest("textarea") || t.closest("[contenteditable='true']")) {
        return;
      }
    }

    let direction = null;
    if (event.key === "ArrowUp") direction = "up";
    else if (event.key === "ArrowDown") direction = "down";
    else if (event.key === "ArrowLeft") direction = "left";
    else if (event.key === "ArrowRight") direction = "right";

    if (direction) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (event.preventDefault) event.preventDefault();
      tryMove(direction);
    }
  }

  function onPointerDown(event) {
    down = { id: event.pointerId, x: event.clientX, y: event.clientY };
    try {
      if (target && target.setPointerCapture && event.pointerId !== undefined) {
        target.setPointerCapture(event.pointerId);
      }
    } catch {}
  }

  function onPointerMove(event) {
    if (!down || down.id !== event.pointerId) return;
    if (event.preventDefault) event.preventDefault();
  }

  function onPointerUp(event) {
    if (!down || down.id !== event.pointerId) return;
    if (event.preventDefault) event.preventDefault();
    const dx = (event.clientX || 0) - (down.x || 0);
    const dy = (event.clientY || 0) - (down.y || 0);
    down = null;
    const rect = (event.currentTarget && event.currentTarget.getBoundingClientRect && event.currentTarget.getBoundingClientRect()) ||
      (event.target && event.target.getBoundingClientRect && event.target.getBoundingClientRect()) ||
      (target && target.getBoundingClientRect && target.getBoundingClientRect()) ||
      { width: 400, height: 400 };
    const direction = resolveSwipe(dx, dy, rect.width || 400, rect.height || 400);
    if (direction) tryMove(direction);
  }

  function onPointerCancel() {
    down = null;
  }

  if (target && typeof target.addEventListener === "function") {
    target.addEventListener("keydown", onKeyDown);
    target.addEventListener("pointerdown", onPointerDown);
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", onPointerUp);
    target.addEventListener("pointercancel", onPointerCancel);
  }

  return {
    release() {
      running = false;
      if (isBlockedNow()) return;
      if (queue.length === 0) return;
      const next = queue.shift();
      if (isBlockedNow()) {
        queue.unshift(next);
        return;
      }
      running = true;
      moveFn(next);
    },
    block() {
      running = true;
    },
    get pending() {
      return queue.length;
    },
    queue,
    destroy() {
      if (target && typeof target.removeEventListener === "function") {
        target.removeEventListener("keydown", onKeyDown);
        target.removeEventListener("pointerdown", onPointerDown);
        target.removeEventListener("pointermove", onPointerMove);
        target.removeEventListener("pointerup", onPointerUp);
        target.removeEventListener("pointercancel", onPointerCancel);
      }
      queue.length = 0;
      down = null;
    },
  };
}
