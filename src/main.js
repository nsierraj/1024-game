/**
 * The entry point: it wires the core, the renderer, the input, and the dialogs together.
 *
 * The core knows the rules and nothing else. The renderer draws what the core produced, the
 * input turns the player's hands into directions, the dialogs ask the questions the rules raise,
 * and this module is where the four of them meet.
 */

import { applyMove, canUndo, createGame, keepPlaying, undo } from "./core/game.js";
import { playMove } from "./ui/animations.js";
import { createDialogs } from "./ui/dialogs.js";
import { createInput } from "./ui/input.js";
import { createRenderer } from "./ui/render.js";

/**
 * The elements the page shell carries, looked up once.
 *
 * @returns {object}
 */
function readElements() {
  const byId = (id) => document.getElementById(id);

  return {
    board: byId("board"),
    score: byId("score"),
    bestScore: byId("best-score"),
    scoreGain: byId("score-gain"),
    newGame: byId("new-game"),
    undo: byId("undo"),
    helpToggle: byId("help-toggle"),
    helpPanel: byId("help-panel"),
    win: {
      dialog: byId("win-dialog"),
      keepPlaying: byId("win-keep-playing"),
      newGame: byId("win-new-game"),
    },
    gameover: {
      dialog: byId("gameover-dialog"),
      score: byId("gameover-score"),
      newGame: byId("gameover-new-game"),
    },
    confirm: {
      dialog: byId("confirm-dialog"),
      start: byId("confirm-start"),
      cancel: byId("confirm-cancel"),
    },
  };
}

const elements = readElements();

const renderer = createRenderer(elements);
const dialogs = createDialogs({
  win: elements.win,
  gameover: elements.gameover,
  confirm: elements.confirm,
});

/**
 * The game in play.
 *
 * The seed comes from the clock, which the core is not allowed to reach for itself. (FR-002)
 */
let game = createGame({ seed: Date.now() });

/** Whether the win has already been reported for this game. */
let winShown = false;

/** Whether the end of the game has already been reported for this game. */
let gameOverShown = false;

const input = createInput({
  target: document,
  isBlocked: () => dialogs.isOpen(),
  onMove: (direction) => {
    void performMove(direction);
  },
});

/**
 * Starts a new game.
 */
function startNewGame() {
  game = createGame({ seed: Date.now(), bestScore: game.bestScore });
  winShown = false;
  gameOverShown = false;
  renderer.render(game);
updateUndo();
  updateUndo();
  input.release();
  elements.board.focus();
}

/**
 * Updates the undo button from the game's state.
 */
function updateUndo() {
  elements.undo.disabled = !canUndo(game);
}
  if (dialogs.isOpen()) return;

  if (game.status === "won" && !winShown) {
    winShown = true;
    dialogs.showWin({
      keepPlaying: () => {
        game = keepPlaying(game);
        updateUndo();
        input.release();
      },
      newGame: () => {
        startNewGame();
      },
      dismissed: () => {
        // The message was dismissed rather than answered, so the game carries on and no
        // further win is raised. (FR-021)
        game = keepPlaying(game);
        updateUndo();
        input.release();
      },
    });
    return;
  }

  if (game.status === "gameover" && !gameOverShown) {
    gameOverShown = true;
    dialogs.showGameOver({
      score: game.score,
      newGame: () => {
        startNewGame();
      },
      dismissed: () => {
        input.release();
      },
    });
  }
}

/**
 * Undoes the most recent move.
 */
function performUndo() {
  if (!canUndo(game)) return;
  game = undo(game);
  renderer.render(game);
updateUndo();
  updateUndo();
  input.release();
}

/**
 * Slides the board and draws the result.
 *
 * @param {import("./core/types.js").Direction} direction
 */
async function performMove(direction) {
  const result = applyMove(game, direction);
  game = result;

  if (!result.changed) {
    // Nothing moved. The game can still end here, because a board that is full and has no
    // equal neighbours cannot be changed by any slide. (FR-022)
    showOutcome();
    input.release();
    return;
  }

  const groups = renderer.applyMove(result, direction);
  renderer.showScoreGain(result.gained);
  await playMove(groups);

  showOutcome();
  updateUndo();
  input.release();
}

elements.newGame.addEventListener("click", () => {
  const inProgress = game.status === "active" && game.moves > 0;
  if (!inProgress) {
    startNewGame();
    return;
  }

  dialogs.showConfirm({
    confirm: () => {
      startNewGame();
    },
    cancel: () => {
      // Declining keeps the game in progress. (FR-030)
      input.release();
    },
  });
});

elements.undo.addEventListener("click", () => {
  performUndo();
});

elements.helpToggle.addEventListener("click", () => {
  const opening = elements.helpPanel.hidden;
  elements.helpPanel.hidden = !opening;
  elements.helpToggle.setAttribute("aria-expanded", String(opening));

  if (opening) {
    const heading = elements.helpPanel.querySelector("h2");
    if (heading) heading.focus();
  } else {
    elements.helpToggle.focus();
  }
});

renderer.render(game);
updateUndo();
