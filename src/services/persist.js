/**
 * Best-effort persistence for the game and its settings.
 *
 * Storage is a cache that may disappear at any moment: denied, evicted, or full. Every access is
 * wrapped so the game never crashes and never shows an error because of it. A record that is
 * corrupted or from an unrecognised format is discarded and a fresh game starts, but the best
 * score lives in a record of its own and is recovered whenever it can still be read. A game saved
 * by an earlier recognised version is converted rather than discarded. (FR-061)
 */

export const GAME_KEY = "1024:v2:game";
export const LEGACY_GAME_KEY = "1024:v1:game";
export const BEST_KEY = "1024:v2:best";
export const SETTINGS_KEY = "1024:v1:settings";

const GAME_VERSION = 2;
const LEGACY_GAME_VERSION = 1;
const BEST_VERSION = 1;
const SETTINGS_VERSION = 1;
const TARGET_VALUE = 1024;

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

function isValidUndo(undo, current) {
  if (undo === null) return true;
  if (!undo || typeof undo !== "object") return false;
  if (!isValidBoard(undo.board)) return false;
  if (!isInteger(undo.score)) return false;
  if (!isInteger(undo.bestScore)) return false;
  if (!isInteger(undo.moves)) return false;
  if (current) {
    if (typeof undo.hasWon !== "boolean") return false;
    if (typeof undo.endless !== "boolean") return false;
    if (typeof undo.status !== "string" || !STATUSES.has(undo.status)) return false;
  }
  return true;
}

function isValidGameRecord(record, version) {
  if (!record || typeof record !== "object") return false;
  if (record.version !== version) return false;
  if (!isValidBoard(record.board)) return false;
  if (!isInteger(record.score)) return false;
  if (!isInteger(record.bestScore)) return false;
  if (!isInteger(record.moves)) return false;
  if (record.bestScore < record.score) return false;
  if (typeof record.hasWon !== "boolean") return false;
  if (typeof record.endless !== "boolean") return false;
  if (typeof record.status !== "string" || !STATUSES.has(record.status)) return false;
  if (!isValidUndo(record.undo, version === GAME_VERSION)) return false;
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

function copyUndo(undo) {
  if (undo === null) return null;
  return {
    board: undo.board.slice(),
    score: undo.score,
    bestScore: undo.bestScore,
    moves: undo.moves,
    hasWon: undo.hasWon,
    endless: undo.endless,
    status: undo.status,
  };
}

/**
 * Converts a version 1 snapshot, which did not record the win, to the current shape.
 *
 * A snapshot is the state before a move. The win had already happened then only if the board
 * held a 1024 tile or higher, so a snapshot without one is the move that created the win.
 *
 * @param {object} record A valid version 1 game record.
 * @returns {object|null}
 */
function convertLegacyUndo(record) {
  if (record.undo === null) return null;
  const hadWon = record.hasWon && record.undo.board.some((value) => value >= TARGET_VALUE);
  return {
    board: record.undo.board.slice(),
    score: record.undo.score,
    bestScore: record.undo.bestScore,
    moves: record.undo.moves,
    hasWon: hadWon,
    endless: hadWon && record.endless,
    status: "active",
  };
}

function readJson(store, key) {
  const raw = store.getItem(key);
  if (typeof raw !== "string" || raw.length === 0) return null;
  return JSON.parse(raw);
}

/**
 * Loads the saved game, returning null if missing, corrupted, or from an unrecognised format. A
 * game saved by version 1 is converted. (FR-061)
 * @param {Storage} [storage]
 * @returns {object|null}
 */
export function loadGame(storage) {
  const store = getStore(storage);
  if (!store) return null;

  try {
    const parsed = readJson(store, GAME_KEY);
    if (isValidGameRecord(parsed, GAME_VERSION)) {
      return {
        board: parsed.board.slice(),
        score: parsed.score,
        bestScore: parsed.bestScore,
        moves: parsed.moves,
        hasWon: parsed.hasWon,
        endless: parsed.endless,
        status: parsed.status,
        undo: copyUndo(parsed.undo),
      };
    }
  } catch {
    // Fall through to the earlier version.
  }

  try {
    const legacy = readJson(store, LEGACY_GAME_KEY);
    if (isValidGameRecord(legacy, LEGACY_GAME_VERSION)) {
      return {
        board: legacy.board.slice(),
        score: legacy.score,
        bestScore: legacy.bestScore,
        moves: legacy.moves,
        hasWon: legacy.hasWon,
        endless: legacy.endless,
        status: legacy.status,
        undo: convertLegacyUndo(legacy),
      };
    }
  } catch {
    // Nothing usable.
  }

  return null;
}

/**
 * Loads the best score, which survives a game record that cannot be read.
 *
 * The best score record is authoritative. When it is missing or damaged, the best score is
 * recovered from whichever game record still carries a readable one. (FR-061)
 * @param {Storage} [storage]
 * @returns {number}
 */
export function loadBestScore(storage) {
  const store = getStore(storage);
  if (!store) return 0;

  for (const [key, version] of [[BEST_KEY, BEST_VERSION], [GAME_KEY, GAME_VERSION], [LEGACY_GAME_KEY, LEGACY_GAME_VERSION]]) {
    try {
      const parsed = readJson(store, key);
      if (parsed && typeof parsed === "object" && isInteger(parsed.bestScore)) {
        if (key !== BEST_KEY || parsed.version === version) return parsed.bestScore;
      }
    } catch {
      // Try the next record.
    }
  }
  return 0;
}

/**
 * Saves the best score on its own, so it is kept even when the game record cannot be written.
 * @param {Storage} store
 * @param {number} bestScore
 */
function saveBestScore(store, bestScore) {
  try {
    store.setItem(BEST_KEY, JSON.stringify({ version: BEST_VERSION, bestScore }));
  } catch {
    // Best-effort only.
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
        hasWon: game.undo.hasWon,
        endless: game.undo.endless,
        status: game.undo.status,
      },
    };
    store.setItem(GAME_KEY, JSON.stringify(record));
    // The converted game is saved, so the old record must not be resumed again.
    store.removeItem(LEGACY_GAME_KEY);
  } catch {
    // Best-effort only.
  }
  saveBestScore(store, game.bestScore);
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
