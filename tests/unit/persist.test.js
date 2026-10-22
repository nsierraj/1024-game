import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BEST_KEY,
  defaultSettings,
  GAME_KEY,
  LEGACY_GAME_KEY,
  loadBestScore,
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
    game.undo = { board: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 0, bestScore: 0, moves: 0, hasWon: false, endless: false, status: "active" };
    saveGame(storage, game);
    const loaded = loadGame(storage);
    assert.deepEqual(loaded.undo, game.undo);
  });

  it("discards a record with wrong version", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 99, board: makeGame().board, score: 6, bestScore: 10, moves: 2, hasWon: false, endless: false, status: "active", undo: null }));
    assert.equal(loadGame(storage), null);
  });

  it("discards a record with a malformed board", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 2, board: [2, 4], score: 6, bestScore: 10, moves: 2, hasWon: false, endless: false, status: "active", undo: null }));
    assert.equal(loadGame(storage), null);
  });

  it("discards when bestScore is less than score", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 2, board: makeGame().board, score: 10, bestScore: 6, moves: 2, hasWon: false, endless: false, status: "active", undo: null }));
    assert.equal(loadGame(storage), null);
  });

  it("discards invalid status", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 2, board: makeGame().board, score: 6, bestScore: 10, moves: 2, hasWon: false, endless: false, status: "paused", undo: null }));
    assert.equal(loadGame(storage), null);
  });

  it("discards when undo is malformed", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 2, board: makeGame().board, score: 6, bestScore: 10, moves: 2, hasWon: false, endless: false, status: "active", undo: { board: [] } }));
    assert.equal(loadGame(storage), null);
  });

  it("discards an undo snapshot that lacks the win fields", () => {
    const storage = createMemoryStorage();
    storage.setItem(GAME_KEY, JSON.stringify({ version: 2, board: makeGame().board, score: 6, bestScore: 10, moves: 2, hasWon: false, endless: false, status: "active", undo: { board: makeGame().board, score: 0, bestScore: 0, moves: 0 } }));
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
  describe("versions and the best score (FR-061)", () => {
    const legacyRecord = (overrides = {}) => ({
      version: 1,
      savedAt: 1,
      board: [1024, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
      score: 2100,
      bestScore: 3000,
      moves: 40,
      hasWon: true,
      endless: true,
      status: "active",
      undo: { board: [512, 512, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], score: 2000, bestScore: 3000, moves: 39 },
      ...overrides,
    });

    it("converts and resumes a game saved by version 1", () => {
      const storage = createMemoryStorage();
      storage.setItem(LEGACY_GAME_KEY, JSON.stringify(legacyRecord()));

      const loaded = loadGame(storage);

      assert.equal(loaded.score, 2100);
      assert.equal(loaded.bestScore, 3000);
      assert.equal(loaded.moves, 40);
      assert.equal(loaded.hasWon, true);
      assert.equal(loaded.endless, true);
      assert.equal(loaded.undo.moves, 39);
    });

    it("derives the win fields of a version 1 snapshot from its board", () => {
      const storage = createMemoryStorage();
      storage.setItem(LEGACY_GAME_KEY, JSON.stringify(legacyRecord()));

      const { undo } = loadGame(storage);

      // The snapshot board holds no 1024 tile, so the undone move is the one that created it.
      assert.equal(undo.hasWon, false);
      assert.equal(undo.endless, false);
      assert.equal(undo.status, "active");
    });

    it("keeps the win in a version 1 snapshot that already held a 1024 tile", () => {
      const storage = createMemoryStorage();
      const board = [1024, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2];
      storage.setItem(LEGACY_GAME_KEY, JSON.stringify(legacyRecord({ undo: { board, score: 2000, bestScore: 3000, moves: 39 } })));

      const { undo } = loadGame(storage);

      assert.equal(undo.hasWon, true);
      assert.equal(undo.endless, true);
    });

    it("removes the version 1 record once the converted game is saved, so it is not resumed twice", () => {
      const storage = createMemoryStorage();
      storage.setItem(LEGACY_GAME_KEY, JSON.stringify(legacyRecord()));

      saveGame(storage, loadGame(storage));

      assert.equal(storage.getItem(LEGACY_GAME_KEY), null);
      assert.equal(loadGame(storage).score, 2100);
    });

    it("keeps the best score when the game record cannot be written", () => {
      const storage = createMemoryStorage();
      const failing = { ...storage, setItem(key, value) { if (key === GAME_KEY) throw new Error("quota"); storage.setItem(key, value); } };

      saveGame(failing, { ...makeGame(), bestScore: 42 });

      assert.equal(loadBestScore(storage), 42);
    });

    it("prefers the current record over a version 1 record", () => {
      const storage = createMemoryStorage();
      storage.setItem(LEGACY_GAME_KEY, JSON.stringify(legacyRecord()));
      saveGame(storage, makeGame());

      assert.equal(loadGame(storage).score, 6);
    });

    it("starts fresh from a corrupt record but keeps the best score", () => {
      const storage = createMemoryStorage();
      saveGame(storage, makeGame());
      storage.setItem(GAME_KEY, "{not json");

      assert.equal(loadGame(storage), null);
      assert.equal(loadBestScore(storage), 10);
    });

    it("starts fresh from an unrecognised version but keeps the best score", () => {
      const storage = createMemoryStorage();
      storage.setItem(GAME_KEY, JSON.stringify({ version: 99, bestScore: 777, board: "future" }));

      assert.equal(loadGame(storage), null);
      assert.equal(loadBestScore(storage), 777);
    });

    it("recovers the best score from a damaged version 1 record", () => {
      const storage = createMemoryStorage();
      storage.setItem(LEGACY_GAME_KEY, JSON.stringify({ version: 1, board: [], bestScore: 512 }));

      assert.equal(loadGame(storage), null);
      assert.equal(loadBestScore(storage), 512);
    });

    it("returns zero when no best score can be read", () => {
      const storage = createMemoryStorage();
      storage.setItem(GAME_KEY, "garbage");

      assert.equal(loadBestScore(storage), 0);
    });

    it("writes the best score to its own record, and lets it go down (FR-026)", () => {
      const storage = createMemoryStorage();
      saveGame(storage, { ...makeGame(), bestScore: 50 });
      assert.equal(loadBestScore(storage), 50);

      saveGame(storage, { ...makeGame(), bestScore: 10 });

      assert.equal(JSON.parse(storage.getItem(BEST_KEY)).bestScore, 10);
      assert.equal(loadBestScore(storage), 10);
    });

    it("leaves the settings untouched when the game record is corrupt", () => {
      const storage = createMemoryStorage();
      saveSettings(storage, { theme: "dark", sound: true, visited: true });
      storage.setItem(GAME_KEY, "garbage");

      assert.equal(loadGame(storage), null);
      assert.equal(loadSettings(storage).theme, "dark");
    });
  });
});
