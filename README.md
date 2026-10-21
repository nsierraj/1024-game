# 1024

A sliding-tile puzzle game that runs in the browser on desktop and mobile. Slide numbered tiles,
merge matching ones, and build the 1024 tile.

This repository is a **spec-driven build**. The requirements, the project's constitution, and the
feature specification are written first; the implementation follows them.

## Status

| Stage | State |
|---|---|
| Business requirements | Done — [`1024-game-BRD.md`](1024-game-BRD.md) |
| Project constitution | Ratified v1.0.0 — [`constitution.md`](.specify/memory/constitution.md) |
| Feature specification | Done — [`spec.md`](specs/001-1024-browser-game/spec.md) |
| Technical plan | Not started |
| Implementation | Not started |

## What the game will do

- Classic 4x4 board with a win at the 1024 tile, plus an endless mode to keep chasing a score
- Arrow keys on desktop, swipe on touch
- Single-step undo, current score, and a best score that survives a restart
- Light, dark, and additional color themes, following the system preference until you override it
- Installable, and fully playable offline once installed
- Optional sound effects, off by default
- WCAG 2.2 Level AA, playable with a keyboard alone and narrated by a screen reader

## Principles

The project is governed by a written constitution, so the constraints are explicit rather than
implied:

- **Vanilla web stack** — vanilla HTML, CSS, and JavaScript. No frameworks, no runtime
  dependencies, no backend. A static site on any static host.
- **Pure game logic core** — the rules live apart from rendering and input, so they are testable
  without a browser and fast input can never corrupt a game.
- **Test-first rules** — every rule in the spec is covered by an automated check that must pass
  before a release.
- **Accessibility first** — WCAG 2.2 AA is a release gate, not a follow-up task.
- **Budgets that hold** — under 300 KB of assets, 60 fps on mid-range phones, and no data
  collected, no cookies, and no third-party scripts.

See [the full constitution](.specify/memory/constitution.md) for the non-negotiable rules.

## Repository layout

```
1024-game-BRD.md              Business requirements (authoritative source)
.specify/                     Spec Kit scaffolding, templates, and the constitution
  memory/constitution.md        The project's governing principles
specs/001-1024-browser-game/
  spec.md                       Feature specification for the game
  checklists/requirements.md    Specification quality checklist
```

## Tooling

The project is managed with [GitHub Spec Kit](https://github.com/github/spec-kit), with the
OpenCode integration. The command definitions live in
[`.opencode/commands`](.opencode/commands).

## Privacy

The game collects nothing: no personal data, no cookies, no analytics, no crash reporting, and no
third-party requests. Everything stays on the device.
