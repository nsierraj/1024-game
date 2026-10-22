# Verification Log

## Release Gate Checklist

- [x] Spec integrity check passed
- [x] All tests passing
- [x] Asset budgets verified (measured 2026-10-22, see below)
- [x] Contrast ratios verified (computed by `tests/unit/contrast.test.js`, see below)
- [ ] Manual keyboard/screen reader pass
- [ ] Offline/Airplane mode check

## Asset budgets (T066) — measured 2026-10-22

| Item | Measured | Limit | Result |
|---|---|---|---|
| Everything except sound (html, js, css, manifest, icons, `sw.js`, `robots.txt`) | 98.0 KB raw, 32.1 KB gzip | Under 300 KB | Pass |
| Sound (four mp3 files) | 5.5 KB raw | Under 100 KB | Pass |
| Combined | 103.5 KB raw | Under 400 KB | Pass |
| Audio downloaded before sound is first enabled | None. The service worker cache holds no mp3 until the toggle is used. | None (FR-040, SC-015) | Pass, checked in a browser |

Sizes are on-disk file sizes. Transfer sizes under a real host's compression are smaller still.

## Contrast ratios (T067) — computed 2026-10-22

`tests/unit/contrast.test.js` computes the WCAG ratios from the colour tokens in `base.css` and
`themes.css` for light, dark, high-contrast, colour-blind-safe, and the system dark default. It
checks text and every tile pair at 4.5:1, interface colours at 3:1, and the high-contrast theme at
7:1 for text and 4.5:1 for interface colours (FR-045, FR-049, SC-016). The first run found five
shortfalls, now corrected: the dark border (2.76:1), colour-blind tiles 16 and 64, and
high-contrast tiles 16 and "high". It does not check the red-green colour-vision simulation in
FR-044/SC-016, which still needs a person.

## Automated and emulated evidence (2026-10-22)

Gathered in desktop Chromium (Playwright) and desktop Chrome (Lighthouse 12.8.2) against the local
server. **This is supporting evidence. It does not close T065 or T071**, which need a screen
reader and real devices. The tools stayed outside the repository (axe-core 4.10.2 and Lighthouse
were run from a scratch directory), so `package.json` still declares no dependencies.

| Check | Result | Requirement |
|---|---|---|
| axe-core, tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice | 0 violations, in each of the system, light, dark, high-contrast, and colour-blind-safe themes. Scanned in the initial state only: the dialogs were not open. | SC-004 (automated half) |
| Lighthouse, simulated mobile (slow 4G, 4x CPU) | Performance 99, Accessibility 100, Best Practices 100, SEO 100 | FR-059 |
| Lighthouse timings | First contentful paint 1.4 s, largest contentful paint 1.8 s, interactive 1.8 s, blocking time 0 ms, layout shift 0, 92 KiB transferred | FR-057 (indicative; the dev server does not compress) |
| Tab alone | Reaches New game, How to play, Theme, Sound, and the board. Undo is skipped while disabled. | FR-047 |
| Focus ring | 3 px solid outline on the focused control | FR-048 |
| Win dialog | Focus moves to "Keep playing"; Tab stays on the dialog's two buttons; Escape closes it and focus returns to the board | FR-048 |
| Confirmation dialog | Focus moves to "Start new game"; Escape cancels, the score is unchanged, and focus returns to "New game" | FR-030, FR-048 |
| Help panel | Focus moves to its heading | FR-046 |
| Live region | Text was set for a merge, an undo, the win, and game over | FR-051 |
| Touch target size | No visible button, select, or board is under 24 by 24 CSS pixels | FR-053 |
| Layout at 320x640, 640x320, 412x915, 640x512, 1920x1080 | Board square and inside the viewport, no horizontal scroll | FR-065, FR-066, SC-007 |
| Root text at 200% on a 320 px screen | No horizontal scroll and no control outside the viewport. An earlier reading of horizontal scroll came from resizing the window mid-test and did not reproduce on a fresh load. | FR-054 |
| Reduced motion | The reduced-motion rules apply and the tile transition duration is 0 s (0.09 s otherwise) | FR-037 |
| Offline, emulated | With the service worker controlling the page and the network switched off, the game loads from the cache, 60 keyboard moves play, and the game is saved | FR-060, SC-006 (emulated) |
| Sound first enabled while offline, files never fetched | The control stays "Sound: off", nothing is shown, and the setting is not saved. The browser console logs four failed requests for the mp3 files, which the page does not show. | FR-040 |

Not covered by any of the above: what a screen reader actually speaks, behaviour in Firefox, Safari,
Edge, or on a real phone, installation, and the red-green colour-vision simulation.

## Still to be run by a person

- Manual keyboard and screen-reader pass (T065, SC-004): VoiceOver, and NVDA or TalkBack.
- Browser matrix and real phones (T071, SC-011), and the airplane-mode check (SC-006).
- Lighthouse and first-load time against the deployed HTTPS site (FR-057, FR-059). A local run is recorded above.
- Red-green colour-vision simulation of the colour-blind-safe palette (FR-044).

### Runbook for T065 (keyboard and screen-reader pass, SC-004, FR-055)

Serve the game over HTTPS or on `localhost`, then work through section 5 of `quickstart.md` with
a screen reader running. Record each result here, with the date, the screen reader and version,
the browser, and the operating system.

| Row | Screen reader and browser | Result | Notes |
|---|---|---|---|
| Board read cell by cell: each of 16 cells says its value or "empty" | VoiceOver, Safari (macOS) | | |
| A merge is spoken with the new score | VoiceOver, Safari (macOS) | | |
| **The win is spoken.** The live region sits behind the modal dialog; confirm the player hears it, from either the region or the dialog itself | VoiceOver, Safari (macOS) | | |
| **Game over is spoken**, same question as the win | VoiceOver, Safari (macOS) | | |
| Undo is spoken, including from the game-over dialog | VoiceOver, Safari (macOS) | | |
| The same rows on Windows | NVDA, Firefox or Chrome | | |
| The same rows on a phone | VoiceOver (iOS) or TalkBack (Android) | | |
| A complete game, start to game over, by keyboard alone | | | |

### Runbook for T071 (browser matrix, real phones, airplane mode, SC-011, SC-006)

For each row play a few moves, undo, reload and check the game resumes, switch theme, toggle sound,
and open both dialogs.

| Environment | Moves, undo, reload | Themes, sound | Install | Airplane mode, full game | Notes |
|---|---|---|---|---|---|
| Chrome, latest two, desktop | | | | | |
| Edge, latest two, desktop | | | | | |
| Firefox, latest two, desktop | | | | n/a | |
| Safari, latest two, desktop | | | | n/a | |
| Safari on a real iPhone | | | Add to Home Screen | | |
| Safari on an iPad | | | | | |
| Chrome on a real Android phone | | | Install prompt | | |

Also on the phones: swipe-only play (a short swipe must do nothing), the page must not scroll or
zoom from a swipe on the board, and both orientations must keep the board square.

### Other items for a person

- Lighthouse against the deployed HTTPS site, with real compression (FR-057, FR-059).
- The red-green colour-vision simulation of the colour-blind-safe palette (FR-044, SC-016).

