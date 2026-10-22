/**
 * Best-effort persistence for the game and its settings.
 *
 * Storage is a cache that may disappear at any moment: denied, evicted, or full. Every access is
 * wrapped so the game never crashes and never shows an error because of it. Malformed records are
 * discarded and a fresh game starts.
 */

export const GAME_KEY = "1024:v1:game";
export const SETTINGS_KEY = "1024:v1:settings";

const GAME_VERSION = 1;
const SETTINGS_VERSION = 1;

const THEMES = new Set(["system", "light", "dark", "contrast", "colorblind"]);
const STATUSES = new Set(["active", "won", "gameover"]);

function getStore(storage) {
  if (storage) return storage;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
}

function isInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPowerOfTwoOrZero(value) {
  if (value === 0) return true;
  if (typeof value !== "number") return false;
  if (value < 2) return false;
  if ((value & (value - 1)) !== 0) return false;
  return value >= 2;
}

function isValidBoard(board) {
  if (!Array.isArray(board) || board.length !== 16) return false;
  for (let i = 0; i < board.length; i += 1) {
    if (!isPowerOfTwoOrZero(board[i])) return false;
  }
  return true;
}

function isValidUndo(undo) {
  if (undo === null) return true;
  if (!undo || typeof undo !== "object") return false;
  if (!isValidBoard(undo.board)) return false;
  if (!isInteger(undo.score)) return false;
  if (!isInteger(undo.bestScore)) return false;
  if (!isInteger(undo.moves)) return false;
  return true;
}

function isValidGameRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (record.version !== GAME_VERSION) return false;
  if (!isValidBoard(record.board)) return false;
  if (!isInteger(record.score)) return false;
  if (!isInteger(record.bestScore)) return false;
  if (!isInteger(record.moves)) return false;
  if (record.bestScore < record.score) return false;
  if (typeof record.hasWon !== "boolean") return false;
  if (typeof record.endless !== "boolean") return false;
  if (typeof record.status !== "string" || !STATUSES.has(record.status)) return false;
  if (!isValidUndo(record.undo)) return false;
  return true;
}

function isValidSettingsRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (record.version !== SETTINGS_VERSION) return false;
  if (typeof record.theme !== "string") return false;
  if (typeof record.sound !== "boolean") return false;
  if (typeof record.visited !== "boolean") return false;
  return true;
}

/**
 * The default settings, used when nothing is saved or the record is invalid.
 * @returns {{version: number, theme: string, sound: boolean, visited: boolean}}
 */
export function defaultSettings() {
  return { version: SETTINGS_VERSION, theme: "system", sound: false, visited: false };
}

/**
 * Loads the saved game, returning null if missing or malformed.
 * @param {Storage} [storage]
 * @returns {object|null}
 */
export function loadGame(storage) {
  const store = getStore(storage);
  if (!store) return null;

  try {
    const raw = store.getItem(GAME_KEY);
    if (typeof raw !== "string" || raw.length === 0) return null;
    const parsed = JSON.parse(raw);
    if (!isValidGameRecord(parsed)) return null;
    return {
      board: parsed.board.slice(),
      score: parsed.score,
      bestScore: parsed.bestScore,
      moves: parsed.moves,
      hasWon: parsed.hasWon,
      endless: parsed.endless,
      status: parsed.status,
      undo: parsed.undo === null ? null : {
        board: parsed.undo.board.slice(),
        score: parsed.undo.score,
        bestScore: parsed.undo.bestScore,
        moves: parsed.undo.moves,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Saves the current game. Best-effort and non-fatal.
 * @param {Storage} [storage]
 * @param {object} game
 */
export function saveGame(storage, game) {
  const store = getStore(storage);
  if (!store) return;

  try {
    const record = {
      version: GAME_VERSION,
      savedAt: Date.now(),
      board: Array.isArray(game.board) ? game.board.slice() : [],
      score: game.score,
      bestScore: game.bestScore,
      moves: game.moves,
      hasWon: game.hasWon,
      endless: game.endless,
      status: game.status,
      undo: game.undo === null ? null : {
        board: Array.isArray(game.undo.board) ? game.undo.board.slice() : [],
        score: game.undo.score,
        bestScore: game.undo.bestScore,
        moves: game.undo.moves,
      },
    };
    store.setItem(GAME_KEY, JSON.stringify(record));
  } catch {
    // Best-effort only.
  }
}

/**
 * Loads the settings, returning defaults when missing or invalid.
 * @param {Storage} [storage]
 * @returns {{version: number, theme: string, sound: boolean, visited: boolean}}
 */
export function loadSettings(storage) {
  const store = getStore(storage);
  if (!store) return defaultSettings();

  try {
    const raw = store.getItem(SETTINGS_KEY);
    if (typeof raw !== "string" || raw.length === 0) return defaultSettings();
    const parsed = JSON.parse(raw);
    if (!isValidSettingsRecord(parsed)) return defaultSettings();
    const theme = THEMES.has(parsed.theme) ? parsed.theme : "system";
    return {
      version: SETTINGS_VERSION,
      theme,
      sound: parsed.sound === true,
      visited: parsed.visited === true,
    };
  } catch {
    return defaultSettings();
  }
}

/**
 * Saves the settings. Best-effort and non-fatal.
 * @param {Storage} [storage]
 * @param {object} settings
 */
export function saveSettings(storage, settings) {
  const store = getStore(storage);
  if (!store) return;

  try {
    const theme = THEMES.has(settings.theme) ? settings.theme : "system";
    const record = {
      version: SETTINGS_VERSION,
      theme,
      sound: settings.sound === true,
      visited: settings.visited === true,
    };
    store.setItem(SETTINGS_KEY, JSON.stringify(record));
  } catch {
    // Best-effort only.
  }
}
