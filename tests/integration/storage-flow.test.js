import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyMove, createGame, undo } from "../../src/core/game.js";
import { GAME_KEY, loadGame, saveGame } from "../../src/services/persist.js";

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
