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
| Technical plan | Done — [`plan.md`](specs/001-1024-browser-game/plan.md) |
| Implementation | Not started |

## What the game will do

- Classic 4x4 board with a win at the 1024 tile, plus an endless mode to keep chasing a score
- Arrow keys on desktop, swipe on touch
- Single-step undo, current score, and a best score that survives a restart
- Light, dark, high-contrast, and color-blind-safe themes, following the system preference until
  you override it
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
  plan.md                       Technical plan and constitution check
  research.md                   Design decisions and their rejected alternatives
  data-model.md                 Entities, invariants, and state transitions
  quickstart.md                 How to validate the finished game
  contracts/                    Interfaces: logic core, storage, UI, offline
  checklists/requirements.md    Specification quality checklist
scripts/check-specs.mjs       Spec integrity check (no dependencies)
.github/workflows/ci.yml       The required check for protected branches
```

## Contributing

`main` is protected. Every change reaches it through a pull request — direct pushes are
rejected, force pushes and branch deletion are blocked, and the history is kept linear.

A pull request cannot merge until two checks pass:

| Check | What it does |
|---|---|
| `spec-integrity` | Verifies that each feature's specification and plan are complete and self-consistent: no unresolved placeholders, contiguous requirement and success-criterion ids, and a checklist that references only real ids |
| `test` | Runs the automated test suite |

Both run on Node's built-in test runner and use no third-party packages, so the project still has
no dependencies and no build step.

This is a project rule, not just a setting. Constitution v1.1.0 requires that every change to
`main` arrives through a pull request whose status checks pass. The rule and its rationale are in
[amendment 001](.specify/memory/amendments/001-pull-request-requirement.md).

## Tooling

The project is managed with [GitHub Spec Kit](https://github.com/github/spec-kit), with the
OpenCode integration. The command definitions live in
[`.opencode/commands`](.opencode/commands).

## Privacy

The game collects nothing: no personal data, no cookies, no analytics, no crash reporting, and no
third-party requests. Everything stays on the device.

## License

[MIT](LICENSE) — Copyright (c) 2026 Amado Sierra
