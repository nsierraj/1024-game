/**
 * The keyboard: the arrow keys slide the board, and input that arrives while a move is still
 * being animated waits its turn rather than being lost. (FR-010, FR-064)
 */

/**
 * The direction each key slides the board in.
 * @type {Readonly<Record<string, import("../core/types.js").Direction>>}
 */
const KEY_DIRECTIONS = Object.freeze({
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
});

/**
 * Whether the key came from a control that uses the arrow keys itself.
 *
 * The theme picker is a list, and the arrow keys move through its options. Taking them would
 * make the picker unusable.
 *
 * @param {EventTarget | null} target
 * @returns {boolean}
 */
function isFormControl(target) {
  if (!target || typeof target.closest !== "function") return false;
  return target.closest("input, select, textarea") !== null;
}

/**
 * Creates the keyboard controller.
 *
 * @param {object} options
 * @param {EventTarget} [options.target] The element the keys are listened for on.
 * @param {(direction: import("../core/types.js").Direction) => void} options.onMove Called with
 *   the direction of a move that should be made.
 * @param {() => boolean} [options.isBlocked] Whether the keyboard is not to be acted on, because
 *   a dialog is open.
 * @returns {{
 *   enqueue: (direction: import("../core/types.js").Direction) => void,
 *   release: () => void,
 *   destroy: () => void,
 *   readonly pending: number
 * }}
 */
export function createInput({ target = document, onMove, isBlocked = () => false }) {
  /** The directions that are waiting for the current move to finish. */
  const queue = [];
  /** Whether a move is being made right now. */
  let busy = false;

  /**
   * Makes the next move of the queue, if the keyboard is free to.
   */
  function flush() {
    if (busy || isBlocked()) return;
    const direction = queue.shift();
    if (direction === undefined) return;
    busy = true;
    onMove(direction);
  }

  /**
   * Queues a move.
   *
   * @param {import("../core/types.js").Direction} direction
   */
  function enqueue(direction) {
    queue.push(direction);
    flush();
  }

  /**
   * Says that the move in progress is over, so that the next one can start.
   */
  function release() {
    busy = false;
    flush();
  }

  /**
   * Handles a key.
   * @param {KeyboardEvent} event
   */
  function handleKeyDown(event) {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;
    if (event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (isFormControl(event.target)) return;
    if (isBlocked()) return;

    event.preventDefault();
    enqueue(direction);
  }

  target.addEventListener("keydown", handleKeyDown);

  return {
    enqueue,
    release,
    destroy() {
      target.removeEventListener("keydown", handleKeyDown);
    },
    get pending() {
      return queue.length;
    },
  };
}
