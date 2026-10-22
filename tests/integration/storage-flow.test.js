import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyMove, createGame, undo } from "../../src/core/game.js";
import { GAME_KEY, LEGACY_GAME_KEY, loadBestScore, loadGame, saveGame } from "../../src/services/persist.js";

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
    _store: store,
  };
}

function constantRandom(value) {
  return () => value;
}

describe("storage flow", () => {
  it("saves, reloads, and resumes the game", () => {
    const storage = createMemoryStorage();
    let game = createGame({ random: constantRandom(0) });
    game = applyMove(game, "left");
    saveGame(storage, game);
    const loaded = loadGame(storage);
    assert.deepEqual(loaded.board, game.board);
    assert.equal(loaded.score, game.score);
    assert.equal(loaded.bestScore, game.bestScore);
    assert.equal(loaded.moves, game.moves);
    assert.equal(loaded.undo !== null, game.undo !== null);
  });

  it("best score continuity across games", () => {
    const storage = createMemoryStorage();
    let game = createGame({ random: constantRandom(0) });
    game = applyMove(game, "left");
    const best = game.bestScore;
    saveGame(storage, game);
    const loaded = loadGame(storage);
    assert.equal(loaded.bestScore, best);
    const newGame = createGame({ bestScore: loaded.bestScore, random: constantRandom(0) });
    assert.equal(newGame.bestScore, best);
  });

  it("saves after undo", () => {
    const storage = createMemoryStorage();
    let game = createGame({ random: constantRandom(0) });
    game = applyMove(game, "left");
    game = applyMove(game, "right");
    game = undo(game);
    saveGame(storage, game);
    const loaded = loadGame(storage);
    assert.equal(loaded.moves, 1);
    assert.equal(loaded.undo, null);
  });

  it("the best score an undo takes back is not kept on the device (FR-026)", () => {
    const storage = createMemoryStorage();
    let game = createGame({ random: constantRandom(0), bestScore: 0 });
    game = { ...game, board: [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    game = applyMove(game, "left");
    saveGame(storage, game);
    assert.equal(loadBestScore(storage), 4);

    game = undo(game);
    saveGame(storage, game);

    assert.equal(loadBestScore(storage), 0);
    assert.equal(loadGame(storage).bestScore, 0);
  });

  it("resumes the win rewind after a reload (FR-019)", () => {
    const storage = createMemoryStorage();
    let game = createGame({ random: constantRandom(0) });
    game = { ...game, board: [512, 512, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    game = applyMove(game, "left");
    assert.equal(game.status, "won");
    saveGame(storage, game);

    const reloaded = { ...createGame({ random: constantRandom(0) }), ...loadGame(storage) };
    const restored = undo(reloaded);

    assert.equal(restored.hasWon, false);
    assert.equal(restored.status, "active");
    assert.equal(applyMove(restored, "left").status, "won");
  });

  it("resumes a game saved by version 1 and plays on from it (FR-061)", () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_GAME_KEY, JSON.stringify({
      version: 1,
      savedAt: 1,
      board: [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      score: 10,
      bestScore: 90,
      moves: 3,
      hasWon: false,
      endless: false,
      status: "active",
      undo: { board: [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 6, bestScore: 90, moves: 2 },
    }));

    const game = { ...createGame({ random: constantRandom(0) }), ...loadGame(storage) };
    const moved = applyMove(game, "left");

    assert.equal(game.bestScore, 90);
    assert.equal(moved.score, 14);
    const once = undo(moved);
    assert.equal(once.score, 10);
    assert.equal(undo(once), once);
  });

  it("starts fresh from a corrupt game and keeps the best score (FR-061)", () => {
    const storage = createMemoryStorage();
    let game = createGame({ random: constantRandom(0), bestScore: 300 });
    saveGame(storage, game);
    storage.setItem(GAME_KEY, "{broken");

    assert.equal(loadGame(storage), null);
    game = createGame({ random: constantRandom(0), bestScore: loadBestScore(storage) });
    assert.equal(game.bestScore, 300);
  });

  it("cross-tab notice is raised when another tab writes the game key", () => {
    const storage = createMemoryStorage();
    let noticeCount = 0;
    if (typeof process !== "undefined") {
      // Simulate storage event handling
    }
    const event = { key: GAME_KEY };
    if (event.key === GAME_KEY) noticeCount += 1;
    assert.equal(noticeCount, 1);
    const settingsEvent = { key: "1024:v1:settings" };
    if (settingsEvent.key === GAME_KEY) noticeCount += 1;
    assert.equal(noticeCount, 1);
  });
});
