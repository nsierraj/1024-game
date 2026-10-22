/**
 * Every user-facing string in the game.
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

  emptyCell: "empty",
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
  winAnnouncement: "You reached 1024. Keep playing or start a new game.",

  gameOverTitle: "Game over",
  gameOverBody: "No more moves.",
  gameOverNewGame: "Try again",
  gameOverAnnouncement: (score) => `Game over. Final score ${score}. Start a new game to try again.`,
  gameOverUndo: "Undo last move",

  confirmTitle: "Start a new game?",
  confirmBody: "Your current game will be replaced.",
  confirmStart: "Start new game",
  confirmCancel: "Cancel",

  scoreGained: (value) => `+${value}`,
  mergedAnnouncement: (value, score) => `Merged ${value}. Score ${score}.`,
  undoAnnouncement: (score) => `Move undone. Score ${score}.`,

  crossTabNotice: "The game was updated in another tab.",
});
