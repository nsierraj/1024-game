# Contract: Offline, Install, and Audio

**Feature**: 001-1024-browser-game | **Date**: 2026-10-21 | **Plan**: [plan.md](../plan.md)

This contract covers the three browser-service behaviours that sit outside the game rules: the
service worker that makes the game work offline, the install path, and the lazy-loaded sound.

## Service worker

`sw.js` is hand-written. No library is used (D-12).

### Cache naming

```js
const CACHE_VERSION = "v1";
const CACHE_NAME = `1024-${CACHE_VERSION}`;
```

The version segment is bumped whenever the precached asset list or the asset contents change.
The cache name is what makes a deploy take effect.

### Precached asset list

```js
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/main.js",
  "./src/core/constants.js",
  "./src/core/random.js",
  "./src/core/board.js",
  "./src/core/game.js",
  "./src/core/types.js",
  "./src/ui/render.js",
  "./src/ui/animations.js",
  "./src/ui/input.js",
  "./src/ui/dialogs.js",
  "./src/ui/a11y.js",
  "./src/ui/themes.js",
  "./src/ui/strings.js",
  "./src/services/persist.js",
  "./src/services/settings.js",
  "./src/services/audio.js",
  "./src/services/sw-register.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-512.png"
];
```

Audio files are deliberately absent. They are fetched on demand when the player first enables
sound (FR-040), and they are cached by the runtime strategy below once fetched, so a player who
never enables sound never downloads them.

The asset list is the single source of truth for both the precache and the build-time check in
[quickstart.md](../quickstart.md). A missing file in the list is a failed check, not a silent
gap.

### Strategies

| Request | Strategy | Reason |
|---|---|---|
| Navigation (`mode === "navigate"`) | Network first, fall back to the cached `./index.html` | The newest shell must win after a deploy, but the game must still open with no connection (FR-040, FR-059, FR-062). |
| A precached asset | Cache first | The shell is versioned by the cache name, so a hit is always the right version. |
| Any other same-origin request | Cache first, then network, then cache the response | Audio files and any asset added after the first visit become available offline. |
| A cross-origin request | Passed through, not cached | The game loads nothing from another origin (FR-062). |

### Lifecycle

| Event | Behavior |
|---|---|
| `install` | Precache every asset in the list. If any fetch fails, the install fails and the old worker stays active. This is deliberate: a partially cached shell is worse than the previous good one. |
| `activate` | Delete every cache whose name does not match `CACHE_NAME`. Claim open clients. |
| `fetch` | Apply the strategies above. |

### The new worker waits

**The service worker MUST NOT call `skipWaiting()` on its own** (D-12).

FR-061 requires that a newly published version becomes available to returning players without
breaking a game that is in progress. If a new worker took over mid-game, a reload could pair a
stale cached shell with newer modules, or the update could land in the middle of a move. Letting
the new worker wait means it activates on the next navigation, which is the moment the player is
not mid-move.

A user-initiated update is still possible: the UI can show "A new version is available. Reload
now?", and the reload path may call `skipWaiting()` deliberately, from a click, at a moment the
player chose. That is a different thing from an automatic update, and it is the only path that
may force activation.

## Installability

- The game is served over HTTPS (FR-067). A service worker and an install prompt both require a
  secure context.
- `manifest.webmanifest` declares `name`, `short_name`, `start_url`, `display: "standalone"`,
  `background_color`, `theme_color`, and icons at 192 and 512 pixels plus a maskable variant
  (FR-060).
- `display: "standalone"` gives an app-like window with no browser chrome.
- The theme colour matches the active theme so the browser's title bar does not clash.
- **iOS has no programmatic install prompt.** The "How to play" panel documents the manual
  steps: Share, then "Add to Home Screen" (D-13). This is the mitigation the BRD prescribes for
  the iOS install risk.
- iOS ignores `manifest.webmanifest` icons in some versions and uses the Apple touch icon
  instead, so `index.html` also carries `<link rel="apple-touch-icon">`.

## Offline behavior

- With no connection, the game opens from the cached shell and plays normally (FR-062).
- The saved game is read from `localStorage`, which needs no network (FR-031, FR-032).
- Sound files are cached the first time they are fetched, so sound keeps working with no
  connection afterwards (FR-040).
- If an asset is not in the cache and there is no network, the request fails and the game
  continues with whatever it has. The service worker never blocks a request indefinitely.

## Storage durability on iOS

Storage is best-effort everywhere (D-13). Apple's storage policies can evict site data, and the
Persistent Storage API would require a notification permission that contradicts the project's
privacy posture (FR-062, FR-068). The design therefore:

- Treats every stored value as a cache that may vanish.
- Starts a fresh game when the saved game is missing or malformed, with no error message.
- Never lets a storage failure interrupt play.

## Audio

> **Superseded by feature 002.** The four mp3 files described here were identical, quiet, and are removed. Sound is now
> made in the game by a pure renderer and needs no fetch, so it works offline from the first enable. See
> [`specs/002-modern-style-audio/contracts/audio-contract.md`](../../002-modern-style-audio/contracts/audio-contract.md).
> The rest of this section is kept as the record of feature 001.

Four effects: `move`, `merge`, `win`, `gameover`.

| Property | Value | Reason |
|---|---|---|
| Format | Mono MP3, low bitrate | Supported by every browser in the target matrix, one file per effect, no codec matrix (D-14). |
| Total size | Under 100 KB | FR-040, SC-008. |
| Loaded | On the first enable of sound only | FR-040: a player who never turns sound on never downloads any audio. |
| Default | Off | FR-039. |
| Control | A visible button with `aria-pressed` | FR-039. |
| Offline | Works after the first fetch, because the runtime strategy caches the files | FR-040. |

### Loading sequence

1. The player activates the sound toggle for the first time.
2. The audio service fetches all four files and decodes them.
3. The toggle switches to on. The service does not report success until the files are ready, so
   the control never claims sound is on when it is not.
4. Every later toggle is instant.

A failed fetch leaves the sound off and reports nothing to the player beyond the control staying
in its off state. Sound is a nicety; a failure to load it must not block play.

**Offline before the first fetch (clarified 2026-10-22).** The files are not precached, so a player
who installs the game, goes offline, and enables sound for the first time cannot load them. The
control stays off, nothing is shown, and play is unaffected. Once the files have been fetched
online, the runtime strategy has cached them and sound works offline.

**Reload with sound saved on.** The audio service fetches the files again at startup. If that
fails, the control is shown off and the saved setting is cleared, so the control never claims
sound is on when it is not.

### Playback

- One effect plays at a time per event. A merge replaces a move effect rather than stacking with
  it.
- The playback API MUST NOT start before a user gesture, or browsers will block it. Since sound
  is enabled by a click, this is satisfied naturally.
- The gain is capped so a burst of merges cannot be startling.

## Budget

| Item | Limit | Requirement |
|---|---|---|
| All assets except sound | Under 300 KB | FR-058, SC-008, SC-015 |
| Sound | Under 100 KB | FR-058, SC-015 |
| Combined | Under 400 KB | FR-058 |
| Fonts | 0 bytes | The system font stack is used (D-15). |
| Interface icons | 0 extra requests | Inline SVG (D-15). |
| Manifest icons | 3 small PNG files | D-15. |
| Third-party requests | 0 | FR-062, FR-068. |

The budget is checked in CI by measuring the transfer size of the built asset list; see
[quickstart.md](../quickstart.md).
