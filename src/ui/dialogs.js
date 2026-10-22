/**
 * The dialogs: the win, the game over, and the confirmation before a new game.
 *
 * The dialogs are native `<dialog>` elements, so the browser moves the focus into the dialog
 * when it opens, keeps it there while the dialog is open, and gives it back when the dialog
 * closes. (FR-048)
 *
 * A dialog enters with a stylesheet animation and leaves through a short transition: `data-closing`
 * plays the reverse for `LEAVE_MS`, and only then is `close()` called and the choice handled. The
 * handler runs after the real close, so a move queued behind the dialog is released when the dialog
 * is truly gone. With reduced motion there is no wait. (FR-017, FR-007)
 */

import { prefersReducedMotion } from "./animations.js";

/** How long a dialog takes to leave, in milliseconds. */
export const LEAVE_MS = 120;

/**
 * The handlers a dialog starts with, so that a click never reaches an empty function.
 * @returns {Record<string, () => void>}
 */
function noHandlers() {
  return {
    keepPlaying() {},
    newGame() {},
    undo() {},
    dismissed() {},
    confirm() {},
    cancel() {},
  };
}

/**
 * Creates the dialogs.
 *
 * @param {object} elements
 * @param {HTMLDialogElement} elements.win.dialog The dialog that reports a win.
 * @param {HTMLButtonElement} elements.win.keepPlaying The button that carries on after a win.
 * @param {HTMLButtonElement} elements.win.newGame The button that starts a new game after a win.
 * @param {HTMLDialogElement} elements.gameover.dialog The dialog that reports the end of the game.
 * @param {HTMLElement} elements.gameover.score The element that shows the final score.
 * @param {HTMLButtonElement} elements.gameover.undo The button that takes back the final move.
 * @param {HTMLButtonElement} elements.gameover.newGame The button that starts a new game.
 * @param {HTMLDialogElement} elements.confirm.dialog The dialog that asks before a new game.
 * @param {HTMLButtonElement} elements.confirm.start The button that starts the new game.
 * @param {HTMLButtonElement} elements.confirm.cancel The button that keeps the current game.
 * @param {(run: () => void, ms: number) => void} [elements.schedule] Runs a function after a delay; replaceable so a test can drive the leave transition.
 * @param {() => boolean} [elements.reducedMotion] Whether the player asked for less motion.
 * @returns {{
 *   showWin: (handlers: object) => void,
 *   showGameOver: (handlers: object) => void,
 *   showConfirm: (handlers: object) => void,
 *   isOpen: () => boolean
 * }}
 */
export function createDialogs({
  win,
  gameover,
  confirm,
  schedule = (run, ms) => setTimeout(run, ms),
  reducedMotion = prefersReducedMotion,
}) {
  let winHandlers = noHandlers();
  let gameOverHandlers = noHandlers();
  let confirmHandlers = noHandlers();

  /** The dialogs that are leaving, so a second click on the way out is ignored. */
  const leaving = new WeakSet();

  /**
   * Closes a dialog with its leave transition, then runs what the player chose.
   * @param {HTMLDialogElement} dialog
   * @param {() => void} chosen
   */
  function leave(dialog, chosen) {
    if (leaving.has(dialog)) return;

    if (reducedMotion()) {
      dialog.close();
      chosen();
      return;
    }

    leaving.add(dialog);
    dialog.setAttribute("data-closing", "");
    schedule(() => {
      dialog.removeAttribute("data-closing");
      dialog.close();
      leaving.delete(dialog);
      chosen();
    }, LEAVE_MS);
  }

  win.keepPlaying.addEventListener("click", () => {
    leave(win.dialog, () => winHandlers.keepPlaying());
  });

  win.newGame.addEventListener("click", () => {
    leave(win.dialog, () => winHandlers.newGame());
  });

  win.dialog.addEventListener("cancel", (event) => {
    // Escape closes the dialog, and a win that was dismissed rather than answered is a win
    // that carries on rather than one that is raised again.
    event.preventDefault();
    leave(win.dialog, () => winHandlers.dismissed());
  });

  gameover.undo.addEventListener("click", () => {
    leave(gameover.dialog, () => gameOverHandlers.undo());
  });

  gameover.newGame.addEventListener("click", () => {
    leave(gameover.dialog, () => gameOverHandlers.newGame());
  });

  gameover.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    leave(gameover.dialog, () => gameOverHandlers.dismissed());
  });

  confirm.start.addEventListener("click", () => {
    leave(confirm.dialog, () => confirmHandlers.confirm());
  });

  confirm.cancel.addEventListener("click", () => {
    leave(confirm.dialog, () => confirmHandlers.cancel());
  });

  confirm.dialog.addEventListener("cancel", (event) => {
    // Escape on the confirmation dialog means "cancel", so the game in progress continues.
    event.preventDefault();
    leave(confirm.dialog, () => confirmHandlers.cancel());
  });

  return {
    /**
     * Reports a win and waits for the player to choose.
     * @param {{keepPlaying: () => void, newGame: () => void, dismissed: () => void}} handlers
     */
    showWin(handlers) {
      winHandlers = { ...noHandlers(), ...handlers };
      win.dialog.showModal();
    },

    /**
     * Reports the end of the game and waits for the player to try again.
     * @param {{score: number, undo: () => void, newGame: () => void, dismissed: () => void}} handlers
     */
    showGameOver(handlers) {
      gameOverHandlers = { ...noHandlers(), ...handlers };
      gameover.score.textContent = String(handlers.score);
      gameover.dialog.showModal();
    },

    /**
     * Asks whether a new game should start.
     * @param {{confirm: () => void, cancel: () => void}} handlers
     */
    showConfirm(handlers) {
      confirmHandlers = { ...noHandlers(), ...handlers };
      confirm.dialog.showModal();
    },

    /**
     * Whether a dialog is open.
     * @returns {boolean}
     */
    isOpen() {
      return win.dialog.open || gameover.dialog.open || confirm.dialog.open;
    },
  };
}
