import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultSettings,
  GAME_KEY,
  loadGame,
  loadSettings,
  saveGame,
  saveSettings,
  SETTINGS_KEY,
} from "../../src/services/persist.js";

function makeGame() {
  return {
    board: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    score: 6,
    bestScore: 10,
    moves: 2,
    hasWon: false,
    endless: false,
    status: "active",
    undo: null,
  };
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    _store: store,
  };
}

describe("persist", () => {
  it("saves and loads the game record", () => {
    const storage = createMemoryStorage();
    const game = makeGame();
    saveGame(storage, game);
    const loaded = loadGame(storage);
    assert.equal(loaded.board[1], 2);
    assert.equal(loaded.board[15], 4);
    assert.equal(loaded.score, 6);
    assert.equal(loaded.bestScore, 10);
    assert.equal(loaded.moves, 2);
    assert.equal(loaded.hasWon, false);
    assert.equal(loaded.endless, false);
    assert.equal(loaded.status, "active");
    assert.equal(loaded.undo, null);
  });

  it("re-derives fields from the game on write", () => {
    const storage = createMemoryStorage();
    const game = makeGame();
    game.score = 999;
    game.bestScore = 1;
    saveGame(storage, game);
    const raw = JSON.parse(storage.getItem(GAME_KEY));
    assert.equal(raw.score, 999);
    assert.equal(raw.bestScore, 1);
    assert.equal(raw.moves, 2);
    assert.equal(raw.hasWon, false);
    assert.equal(raw.status, "active");
  });

  it("writes undo snapshot when present", () => {
    const storage = createMemoryStorage();
    const game = makeGame();
    game.undo = { board: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 0, bestScore: 0, moves: 0 };
    saveGame(storage, game);
    const loaded = loadGame(storage);
    assert.deepEqual(loaded.undo, game.undo);
  });

  it("discards a record with wrong version", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 2, board: makeGame().board, score: 6, bestScore: 10, moves: 2, hasWon: false, endless: false, status: "active", undo: null }));
    assert.equal(loadGame(storage), null);
  });

  it("discards a record with a malformed board", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 1, board: [2, 4], score: 6, bestScore: 10, moves: 2, hasWon: false, endless: false, status: "active", undo: null }));
    assert.equal(loadGame(storage), null);
  });

  it("discards when bestScore is less than score", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 1, board: makeGame().board, score: 10, bestScore: 6, moves: 2, hasWon: false, endless: false, status: "active", undo: null }));
    assert.equal(loadGame(storage), null);
  });

  it("discards invalid status", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 1, board: makeGame().board, score: 6, bestScore: 10, moves: 2, hasWon: false, endless: false, status: "paused", undo: null }));
    assert.equal(loadGame(storage), null);
  });

  it("discards when undo is malformed", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 1, board: makeGame().board, score: 6, bestScore: 10, moves: 2, hasWon: false, endless: false, status: "active", undo: { board: [] } }));
    assert.equal(loadGame(storage), null);
  });

  it("treats invalid JSON as missing", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, "not json");
    assert.equal(loadGame(storage), null);
  });

  it("returns defaults for missing settings", () => {
    const storage = createMemoryStorage();
    const settings = loadSettings(storage);
    assert.deepEqual(settings, defaultSettings());
    assert.equal(settings.theme, "system");
    assert.equal(settings.sound, false);
    assert.equal(settings.visited, false);
  });

  it("rejects unknown theme values and falls back to system", () => {
    const storage = createMemoryStorage();
    storage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, theme: "neon", sound: true, visited: true }));
    const settings = loadSettings(storage);
    assert.equal(settings.theme, "system");
  });

  it("loads valid settings", () => {
    const storage = createMemoryStorage();
    saveSettings(storage, { theme: "dark", sound: true, visited: true });
    const settings = loadSettings(storage);
    assert.equal(settings.theme, "dark");
    assert.equal(settings.sound, true);
    assert.equal(settings.visited, true);
  });

  it("a storage failure is non-fatal on read", () => {
    const throwing = {
      getItem() { throw new Error("denied"); },
      setItem() { throw new Error("denied"); },
    };
    assert.equal(loadGame(throwing), null);
    assert.deepEqual(loadSettings(throwing), defaultSettings());
  });

  it("a storage failure is non-fatal on write", () => {
    const throwing = {
      getItem() { return null; },
      setItem() { throw new Error("quota"); },
    };
    saveGame(throwing, makeGame());
    saveSettings(throwing, { theme: "light", sound: true, visited: true });
  });
});
