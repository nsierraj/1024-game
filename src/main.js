/**
 * The entry point: it wires the core, the renderer, the input, and the dialogs together.
 */

import { applyMove, canUndo, createGame, keepPlaying, undo } from "./core/game.js";
import { loadBestScore, loadGame, loadSettings, saveGame, saveSettings, GAME_KEY } from "./services/persist.js";
import { createAudio } from "./services/audio.js";
import { registerServiceWorker } from "./services/sw-register.js";
import { applyTheme } from "./ui/themes.js";
import { createAnnouncer } from "./ui/a11y.js";
import { playMove } from "./ui/animations.js";
import { createDialogs } from "./ui/dialogs.js";
import { createInput } from "./ui/input.js";
import { createRenderer } from "./ui/render.js";

/**
 * The elements the page shell carries, looked up once.
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
    crossTabNotice: byId("cross-tab-notice"),
    statusRegion: byId("status-region"),
    themeSelect: byId("theme-select"),
    soundToggle: byId("sound-toggle"),
    win: {
      dialog: byId("win-dialog"),
      keepPlaying: byId("win-keep-playing"),
      newGame: byId("win-new-game"),
    },
    gameover: {
      dialog: byId("gameover-dialog"),
      score: byId("gameover-score"),
      undo: byId("gameover-undo"),
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

const audio = createAudio();
const announcer = createAnnouncer(elements.statusRegion);

let settings = loadSettings(null);
applyTheme(settings.theme);

if (elements.themeSelect) {
  elements.themeSelect.value = settings.theme;
  elements.themeSelect.addEventListener("change", () => {
    settings = { ...settings, theme: elements.themeSelect.value, visited: true };
    applyTheme(settings.theme);
    saveSettings(null, settings);
  });
}

function updateSoundUI(enabled) {
  if (!elements.soundToggle) return;
  elements.soundToggle.setAttribute("aria-pressed", String(enabled));
  elements.soundToggle.textContent = enabled ? "Sound: on" : "Sound: off";
  elements.soundToggle.setAttribute("aria-label", enabled ? "Sound on" : "Sound off");
}

updateSoundUI(!!settings.sound);

if (elements.soundToggle) {
  elements.soundToggle.addEventListener("click", async () => {
    if (settings.sound) {
      settings = { ...settings, sound: false, visited: true };
      audio.disable();
      updateSoundUI(false);
      saveSettings(null, settings);
      return;
    }

    const ok = await audio.enable();
    if (ok) {
      settings = { ...settings, sound: true, visited: true };
      updateSoundUI(true);
      saveSettings(null, settings);
    } else {
      settings = { ...settings, sound: false, visited: true };
      updateSoundUI(false);
      saveSettings(null, settings);
    }
  });
}

// A saved "sound on" is honoured after a reload by fetching the files again. If they cannot be
// fetched (offline, never cached), the control stays off and play is unaffected. (FR-040)
if (settings.sound) {
  audio.enable().then((ok) => {
    if (ok) return;
    settings = { ...settings, sound: false };
    updateSoundUI(false);
    saveSettings(null, settings);
  });
}

/**
 * Builds a live game from a stored one. The stored record carries the state; the random source
 * and the seed are not stored, so a new one is made.
 * @param {object | null} savedGame
 * @returns {object | null}
 */
function restoreGame(savedGame) {
  if (!savedGame) return null;
  return { ...createGame({ seed: Date.now() }), ...savedGame };
}

// The best score is read on its own, so a game record that cannot be read does not take it down.
const bestScore = loadBestScore(null);
let game = restoreGame(loadGame(null)) ?? createGame({ seed: Date.now(), bestScore });
game.bestScore = Math.max(game.bestScore, bestScore);
saveGame(null, game);

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
  input.release();
  if (elements.board) elements.board.focus();
  saveGame(null, game);
}

/**
 * Updates the undo button from the game's state.
 */
function updateUndo() {
  if (elements.undo) elements.undo.disabled = !canUndo(game);
}

/**
 * Reports the win or the end of the game.
 */
function showOutcome() {
  if (dialogs.isOpen()) return;

  if (game.status === "won" && !winShown) {
    winShown = true;
    announcer.announceWin();
    audio.play("win");
    dialogs.showWin({
      keepPlaying: () => {
        game = keepPlaying(game);
        winShown = false;
        updateUndo();
        input.release();
        saveGame(null, game);
        renderer.render(game);
      },
      newGame: () => {
        startNewGame();
      },
      dismissed: () => {
        game = keepPlaying(game);
        winShown = false;
        updateUndo();
        input.release();
        saveGame(null, game);
        renderer.render(game);
      },
    });
    return;
  }

  if (game.status === "gameover" && !gameOverShown) {
    gameOverShown = true;
    announcer.announceGameOver(game.score);
    audio.play("gameover");
    dialogs.showGameOver({
      score: game.score,
      undo: () => {
        performUndo();
      },
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
  // The undo can take the game out of its win or its end, so both are reported again if they
  // happen again. (FR-019, FR-028)
  winShown = false;
  gameOverShown = false;
  renderer.render(game);
  announcer.announceUndo(game.score);
  updateUndo();
  input.release();
  saveGame(null, game);
  audio.play("move");
}

/**
 * Slides the board and draws the result.
 */
async function performMove(direction) {
  const result = applyMove(game, direction);
  game = result;

  if (!result.changed) {
    showOutcome();
    input.release();
    saveGame(null, game);
    return;
  }

  const groups = renderer.applyMove(result, direction);
  renderer.showScoreGain(result.gained);
  audio.play(result.gained > 0 ? "merge" : "move");
  await playMove(groups);

  announcer.announceMove(result.gained, game.score);
  showOutcome();
  updateUndo();
  input.release();
  saveGame(null, game);
}

if (elements.newGame) {
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
        input.release();
      },
    });
  });
}

if (elements.undo) {
  elements.undo.addEventListener("click", () => {
    performUndo();
  });
}

if (elements.helpToggle && elements.helpPanel) {
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
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    registerServiceWorker();
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === GAME_KEY && elements.crossTabNotice) {
      elements.crossTabNotice.hidden = false;
    }
  });
}

renderer.render(game);
updateUndo();
saveGame(null, game);
// A game saved at its win or its end is reported again when it is reopened.
showOutcome();
