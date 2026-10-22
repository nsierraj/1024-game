/**
 * The dialogs: the win, the game over, and the confirmation before a new game.
 *
 * The dialogs are native `<dialog>` elements, so the browser moves the focus into the dialog
 * when it opens, keeps it there while the dialog is open, and gives it back when the dialog
 * closes. (FR-048)
 */

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
 * @returns {{
 *   showWin: (handlers: object) => void,
 *   showGameOver: (handlers: object) => void,
 *   showConfirm: (handlers: object) => void,
 *   isOpen: () => boolean
 * }}
 */
export function createDialogs({ win, gameover, confirm }) {
  let winHandlers = noHandlers();
  let gameOverHandlers = noHandlers();
  let confirmHandlers = noHandlers();

  win.keepPlaying.addEventListener("click", () => {
    win.dialog.close();
    winHandlers.keepPlaying();
  });

  win.newGame.addEventListener("click", () => {
    win.dialog.close();
    winHandlers.newGame();
  });

  win.dialog.addEventListener("cancel", (event) => {
    // Escape closes the dialog, and a win that was dismissed rather than answered is a win
    // that carries on rather than one that is raised again.
    event.preventDefault();
    win.dialog.close();
    winHandlers.dismissed();
  });

  gameover.undo.addEventListener("click", () => {
    gameover.dialog.close();
    gameOverHandlers.undo();
  });

  gameover.newGame.addEventListener("click", () => {
    gameover.dialog.close();
    gameOverHandlers.newGame();
  });

  gameover.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    gameover.dialog.close();
    gameOverHandlers.dismissed();
  });

  confirm.start.addEventListener("click", () => {
    confirm.dialog.close();
    confirmHandlers.confirm();
  });

  confirm.cancel.addEventListener("click", () => {
    confirm.dialog.close();
    confirmHandlers.cancel();
  });

  confirm.dialog.addEventListener("cancel", (event) => {
    // Escape on the confirmation dialog means "cancel", so the game in progress continues.
    event.preventDefault();
    confirm.dialog.close();
    confirmHandlers.cancel();
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
