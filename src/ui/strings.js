/**
 * Every user-facing string in the game.
 *
 * The rules say all user-facing text lives in one place so that wording changes do not scatter
 * through the renderers, and so the announcement policy can be read in one file. `index.html`
 * carries the same words in its static shell, and T060 checks that the two do not drift.
 */

/**
 * @typedef {object} ThemeOption
 * @property {string} value The value of the `data-theme` attribute, or `"system"` for the
 *   operating system setting.
 * @property {string} label The label shown to the player.
 */

/**
 * The static text of the interface.
 * @type {Readonly<Record<string, string>>}
 */
export const STRINGS = Object.freeze({
  appTitle: "1024",

  scoreLabel: "Score",
  bestScoreLabel: "Best",

  newGame: "New game",
  undo: "Undo",
  soundOn: "Sound: on",
  soundOff: "Sound: off",
  helpToggle: "How to play",
  helpToggleHide: "Hide how to play",

  themeLabel: "Theme",

  /** The word an empty cell reads, so the board's shape is perceivable. (FR-052) */
  emptyCell: "empty",

  /** The name of the board, which also states the controls. (FR-047) */
  boardLabel: "Game board, 4 by 4. Use the arrow keys to slide the tiles.",

  helpGoalHeading: "Goal",
  helpGoalText:
    "Combine tiles to reach 1024. Two tiles showing the same number merge into one tile with double the value.",
  helpControlsHeading: "Controls",
  helpControlsText:
    "Use the arrow keys, or swipe across the board, to slide the tiles. Every tile slides as far as it can, and a new tile appears after each move.",
  helpInstallHeading: "Install",
  helpInstallText:
    "On iOS, tap the Share button and choose Add to Home Screen to install the game. On Android and desktop, the browser may offer an install prompt.",

  winTitle: "You reached 1024!",
  winBody: "Keep playing or start a new game.",
  winKeepPlaying: "Keep playing",
  winNewGame: "New game",

  gameOverTitle: "Game over",
  gameOverBody: "No more moves.",
  gameOverNewGame: "Try again",

  confirmTitle: "Start a new game?",
  confirmBody: "Your current game will be replaced.",
  confirmStart: "Start new game",
  confirmCancel: "Cancel",

  scoreGained: (value) => `+${value}`,
  mergedAnnouncement: (value, score) => `Merged ${value}. Score ${score}.`,
  winAnnouncement: "You reached 1024!",
  gameOverAnnouncement: (score) => `Game over. Score ${score}.`,

  crossTabNotice: "The game was updated in another tab.",
});ng for a higher score, or start a new game.",
  winKeepPlaying: "Keep playing",
  winNewGame: "New game",

  gameOverTitle: "Game over",
  gameOverBody: "Final score {score}.",
  gameOverNewGame: "New game",

  confirmTitle: "Start a new game?",
  confirmBody: "The game in progress will be lost.",
  confirmStart: "Start new game",
  confirmCancel: "Keep playing",
});

/**
 * The theme choices, in the order they appear in the select.
 * @type {readonly ThemeOption[]}
 */
export const THEME_OPTIONS = Object.freeze([
  Object.freeze({ value: "system", label: "System" }),
  Object.freeze({ value: "light", label: "Light" }),
  Object.freeze({ value: "dark", label: "Dark" }),
  Object.freeze({ value: "contrast", label: "High contrast" }),
  Object.freeze({ value: "colorblind", label: "Colour-blind safe" }),
]);

/**
 * The announcements the status region makes.
 *
 * The wording is fixed by the announcement policy in the UI contract. The score announcement is
 * throttled by the caller; the win and game-over announcements are not.
 */
export const ANNOUNCEMENTS = Object.freeze({
  /**
   * A merge awarded points.
   * @param {number} points The points the merge awarded.
   * @param {number} score The score after the merge.
   * @returns {string}
   */
  merge(points, score) {
    return `Merged ${points}. Score ${score}.`;
  },

  /**
   * The 1024 tile was created.
   * @returns {string}
   */
  win() {
    return "You reached 1024. Keep playing or start a new game.";
  },

  /**
   * The game ended.
   * @param {number} score The final score.
   * @returns {string}
   */
  gameOver(score) {
    return `Game over. Final score ${score}. Start a new game to try again.`;
  },

  /**
   * Another tab saved the same game.
   * @returns {string}
   */
  crossTab() {
    return "This game was updated in another tab. The most recent save is shown.";
  },
});
