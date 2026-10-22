import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultSettings, loadSettings, saveSettings } from "../../src/services/persist.js";

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
  };
}

describe("settings", () => {
  it("has the documented defaults", () => {
    const settings = defaultSettings();
    assert.equal(settings.theme, "system");
    assert.equal(settings.sound, false);
    assert.equal(settings.visited, false);
  });

  it("unknown theme falls back to system", () => {
    const storage = createMemoryStorage();
    storage.setItem("1024:v1:settings", JSON.stringify({ version: 1, theme: "neon", sound: true, visited: true }));
    const settings = loadSettings(storage);
    assert.equal(settings.theme, "system");
  });

  it("persists theme and sound and visited flag", () => {
    const storage = createMemoryStorage();
    saveSettings(storage, { theme: "dark", sound: true, visited: true });
    const settings = loadSettings(storage);
    assert.equal(settings.theme, "dark");
    assert.equal(settings.sound, true);
    assert.equal(settings.visited, true);
  });
});
