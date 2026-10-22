# Contract: Theme Tokens

**Feature**: 002-modern-style-audio | **Date**: 2026-10-22 | **Plan**: [plan.md](../plan.md)

The token names and the concrete values of the two soft themes. The values were computed with the WCAG
relative-luminance formula before being written here (R-08). `tests/unit/contrast.test.js` reads these
tokens from the stylesheets and fails the build if a ratio drops below its minimum.

## Names that do not change

Existing tokens keep their names so the stylesheets and tests that use them keep working: `--bg`,
`--surface`, `--board-bg`, `--text`, `--text-strong`, `--accent`, `--border`, `--focus-ring`, and
`--tile-{value}-bg` / `--tile-{value}-fg`. New tokens are `--accent-fg`, `--radius-board`, `--radius-tile`,
`--radius-control`, `--shadow-tile`, `--shadow-raised`, `--tile-highlight`, `--font-ui`.

## Light theme (calm and soft)

| Token | Value | Checked against | Ratio |
|---|---|---|---|
| `--bg` | `#f6f3ee` | | |
| `--surface` | `#ece7de` | | |
| `--board-bg` | `#d8d1c4` | | |
| `--text` | `#3b4452` | `--bg` / `--surface` | 8.89 / 7.99 |
| `--text-strong` | `#1f2933` | `--bg` | 13.33 |
| `--accent` | `#4a56c8` | `--bg` (text use) | 5.49 |
| `--accent-fg` | `#ffffff` | `--accent` | 6.08 |
| `--border` | `#8a8478` | `--bg` | 3.36 |
| `--focus-ring` | `#3f4bbd` | `--bg` / `--surface` | 6.43 / 5.78 |

| Value | Background | Text | Ratio |
|---|---|---|---|
| 2 | `#e3e9f2` | `#1f2933` | 12.09 |
| 4 | `#cce0ea` | `#1f2933` | 10.83 |
| 8 | `#b6dfe2` | `#1f2933` | 10.29 |
| 16 | `#a1d9cc` | `#1f2933` | 9.35 |
| 32 | `#95d0a9` | `#1f2933` | 8.34 |
| 64 | `#a6cb86` | `#1f2933` | 8.09 |
| 128 | `#dac262` | `#1f2933` | 8.34 |
| 256 | `#dd8a40` | `#1f2933` | 5.47 |
| 512 | `#c54026` | `#ffffff` | 5.08 |
| 1024 | `#a12b48` | `#ffffff` | 7.11 |
| above 1024 (`high`) | `#3b2a4a` | `#ffe9a8` | 10.81 |

## Dark theme (calm and soft)

| Token | Value | Checked against | Ratio |
|---|---|---|---|
| `--bg` | `#141a26` | | |
| `--surface` | `#232c3e` | | |
| `--board-bg` | `#1b2230` | | |
| `--text` | `#cdd5e0` | `--bg` / `--surface` | 11.77 / 9.45 |
| `--text-strong` | `#f1f4f8` | `--bg` | 15.79 |
| `--accent` | `#8d98ff` | `--bg` (text use) | 6.69 |
| `--accent-fg` | `#101827` | `--accent` | 6.83 |
| `--border` | `#7d879a` | `--bg` | 4.81 |
| `--focus-ring` | `#a9b2ff` | `--bg` / `--surface` | 8.71 / 6.99 |

| Value | Background | Text | Ratio |
|---|---|---|---|
| 2 | `#364963` | `#ffffff` | 9.17 |
| 4 | `#396174` | `#ffffff` | 6.70 |
| 8 | `#397a7f` | `#ffffff` | 4.92 |
| 16 | `#409682` | `#101827` | 4.99 |
| 32 | `#46a466` | `#101827` | 5.72 |
| 64 | `#81b356` | `#101827` | 7.20 |
| 128 | `#c7b360` | `#101827` | 8.50 |
| 256 | `#d29560` | `#101827` | 6.94 |
| 512 | `#d67966` | `#101827` | 5.74 |
| 1024 | `#d3738b` | `#101827` | 5.58 |
| above 1024 (`high`) | `#e9d8ff` | `#2a1a3d` | 11.98 |

## High-contrast theme

The tile set, text, border, and focus tokens are unchanged: they already reach 7:1 for text and tiles and
4.5:1 for interface colours. It takes the new shape and spacing tokens. Soft shadows are removed so the edges stay crisp, and every tile
gets a 2 px white edge in place of the soft highlight, so the black 2 and 4 tiles stay visible on the dark
board. It stays visually stark by design.

## Colour-blind-safe theme

The tile colours are unchanged (Okabe-Ito based). It takes the new surfaces and accent from the light theme
and the shape, spacing, and depth tokens. A new check simulates deuteranopia and protanopia and requires that
neighbouring values (2 and 4, 4 and 8, and so on) stay distinguishable in the simulation, in addition to the
numbers always being shown (FR-022).

## Rules for every theme

- Text and tile values: at least 4.5:1. Interface colours: at least 3:1. High-contrast: 7:1 and 4.5:1.
- The focus ring is at least 3:1 against both `--bg` and `--surface`, and is never removed, only restyled.
- Hover and press states are derived from the base token with a lightness shift and are not new colours, so
  they are not separate contrast pairs. The resulting pairs are checked in the same test.
- A saved theme value maps to the same theme as before the update (FR-023).
