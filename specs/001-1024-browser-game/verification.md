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

## Still to be run by a person

- Manual keyboard and screen-reader pass (T065, SC-004): VoiceOver, and NVDA or TalkBack.
- Browser matrix and real phones (T071, SC-011), and the airplane-mode check (SC-006).
- Lighthouse scores (FR-059) and the first-load time on throttled 4G (FR-057).
- Red-green colour-vision simulation of the colour-blind-safe palette (FR-044).

