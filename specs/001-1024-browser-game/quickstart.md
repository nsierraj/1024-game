# Quickstart: Validating the 1024 Browser Game

**Feature**: 001-1024-browser-game | **Date**: 2026-10-21 | **Plan**: [plan.md](plan.md)

This is a runnable guide for proving the feature works end to end. It does not describe the
implementation; that is the job of `tasks.md` and the code. Every check here maps to a
requirement in [spec.md](spec.md) and to a contract in [contracts/](contracts/).

---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 22 or newer, 24 LTS recommended | The built-in test runner is stable since Node 20 (D-01). |
| A browser | The latest two stable versions of Chrome, Edge, Firefox, and Safari | BRD section 8.2, FR-055, SC-011. |
| `gh` CLI | Any recent version | Only needed for the GitHub checks in step 6. |

No dependency installation step exists, because the project has no dependencies. There is no
`npm install`, and there is no build step.

---

## 1. Start the development server

A service worker cannot register from a `file://` URL, so the game must be served over HTTP.

```bash
node scripts/serve.mjs
```

Expected output:

```text
1024 dev server running at http://localhost:8080
```

Open <http://localhost:8080> in a browser. The board appears with two tiles and a score of zero.

**Pass condition**: the game renders and is playable in the browser.

## 2. Run the automated test suite

```bash
npm test
```

`npm test` is a single alias for `node --test` (D-01). It MUST print a summary with zero
failures, and MUST exit with status 0.

Expected output shape:

```text
# tests 96
# pass 96
# fail 0
```

**Pass condition**: every test passes and the command exits 0. This is the automated half of
SC-003, and it is the check the branch protection rule requires before a change can reach
`main`.

To run a single file while developing:

```bash
node --test tests/unit/board.test.js
```

## 3. Verify the game rules

The rules are owned by the logic core, whose contract is in
[contracts/logic-core-api.md](contracts/logic-core-api.md). Each row names the test file that
proves it.

| Check | How | Requirement |
|---|---|---|
| The board is 4x4 with 16 cells | Look at the rendered board | FR-001 |
| A new game starts with exactly two tiles | Start a new game, count the tiles | FR-002 |
| A valid move places exactly one new tile | Make a legal move, count the tiles | FR-004 |
| An illegal move changes nothing | Press an arrow that cannot move anything; the board must not change and the score must not move | FR-005 |
| Equal neighbours merge | Slide two equal tiles together | FR-007 |
| A tile merges at most once | Slide `2 2 2 2` left; expect `4 4` | FR-008 |
| The closest pair merges first | Slide `2 2 2` left; expect `4 2` | FR-009 |
| The score increases by the merged value | Merge two 8 tiles; the score increases by 16 | FR-014 |
| The best score persists | Note the best score, reload the page, confirm it is still there | FR-016, FR-017 |
| The win dialog appears at 1024 | Play until 1024 | FR-019 |
| "Keep playing" suppresses further win dialogs | Continue after the win | FR-021 |
| The game ends on a full board with no equal neighbours | Play until the board fills | FR-022 |
| Undo restores the previous position | Make a move, press Undo | FR-025, FR-026 |
| Undo is disabled at the start of a game | Start a new game and look at the Undo button | FR-027 |
| Undo works from the game-over state | Reach game over, press Undo | FR-028 |

**Pass condition**: every row behaves as described, and the same rows are covered by the
automated suite.

## 4. Verify persistence, settings, and multiple tabs

The storage contract is in [contracts/storage-schema.md](contracts/storage-schema.md).

| Check | How | Requirement |
|---|---|---|
| A game in progress survives a reload | Play a few moves, reload | FR-031, FR-032, SC-010 |
| The board, score, and win state resume | Reload and compare | FR-031 |
| The theme survives a reload | Choose a theme, reload | FR-033 |
| Sound survives a reload | Enable sound, reload; the control still shows on | FR-033, FR-039 |
| The other tab notices | Open the game in two tabs, make a move in one; the other tab shows the notice and shows the newest state | FR-034, SC-013 |
| The game runs with storage disabled | Deny storage in the browser and play; the game must work without error | FR-062 |

To inspect the stored values, open the developer tools and run:

```js
JSON.parse(localStorage.getItem("1024:v1:game"))
JSON.parse(localStorage.getItem("1024:v1:settings"))
```

**Pass condition**: both keys hold a record matching the storage contract, and no cookie is set.

## 5. Verify accessibility

Accessibility is a release gate, not an automated-only check (SC-004, FR-055).

### Automated scan

Run an automated accessibility scanner over <http://localhost:8080> and confirm it reports zero
violations. The specific tool is a CI-side choice and is not a runtime dependency.

**Pass condition**: zero violations.

### Manual keyboard pass

| Check | Expected | Requirement |
|---|---|---|
| Reach every control using Tab alone | Every button and the select are reachable | FR-047 |
| Play using only the arrow keys | The board responds to all four arrows | FR-010, FR-047, SC-002 |
| Focus is always visible | A focus ring is visible on every focused element | FR-048 |
| A dialog takes focus | Focus moves into the win dialog when it opens | FR-048 |
| A dialog returns focus | Closing the dialog returns focus to the prior element | FR-048 |
| Tab is trapped in a dialog | Tab does not leave an open dialog | FR-048 |
| Escape closes a dialog | Escape closes the win dialog; on the confirmation dialog it means cancel | FR-048 |
| Text is always readable | Tile values are text, never colour alone | FR-050 |
| The board reads out cell by cell | Each of the 16 cells reads its value or "empty" | FR-052 |
| Score changes are announced | A live region announces the merge and the new score | FR-051 |
| The win is announced | The live region announces reaching 1024 | FR-051 |
| Game over is announced | The live region announces the final score | FR-051 |
| Controls are large enough | Every control is at least 24 by 24 CSS pixels | FR-053 |
| Text at 200% still works | Zoom to 200%; nothing is lost or clipped | FR-054 |
| Narrow viewport works | Resize to 320 pixels wide; the game stays usable | FR-065, SC-007 |
| Reduced motion is honoured | Turn on the OS reduced-motion setting; animations are suppressed | FR-037 |

**Pass condition**: every row passes with both a keyboard and a screen reader.

### Screen reader pass

Verify with VoiceOver on macOS and iOS, and with NVDA on Windows: that the board is navigable
cell by cell, that each cell's value is announced, that the score change is announced, and that
the dialogs are announced with their headings.

**Pass condition**: a screen reader user can complete a full game.

## 6. Verify performance, offline, and size

| Check | How | Expected | Requirement |
|---|---|---|---|
| First load | Measure with the network panel, throttled to fast 4G | Under 2 seconds | FR-057, SC-005 |
| Animation smoothness | Watch a merge on a current mid-range phone | 60 frames per second | FR-056 |
| Animation duration | Measure the slide and merge transition | Under 150 ms | FR-036, SC-009 |
| Animation length on a slow device | Repeat on a low-end phone | Still under 150 ms | SC-009 |
| Non-sound asset size | Sum the transferred sizes of everything except the audio files | Under 300 KB | FR-058, SC-008, SC-015 |
| Sound size | Sum the audio file sizes | Under 100 KB | FR-058, SC-015 |
| Combined size | Sum of both | Under 400 KB | FR-058 |
| Quality scores | Run Lighthouse against the local server | At least 90 for performance, accessibility, best practices, and PWA | FR-059 |
| Offline | Install the app, enable airplane mode, open the game, and play a full game | It opens and plays | FR-062, SC-006 |

**Pass condition**: every number meets its limit.

## 7. Verify installability

| Check | How | Expected | Requirement |
|---|---|---|---|
| Desktop install | Chrome or Edge, install the app | It opens in its own window with no browser chrome | FR-060 |
| Phone install | iOS Safari: Share, then "Add to Home Screen" | The icon appears on the home screen and opens standalone | FR-060 |
| Phone install | Android Chrome: install prompt | The prompt appears and the app installs | FR-060 |
| Manifest correctness | The application panel shows the name, icons, and standalone display | All present | FR-060 |

## 8. Verify the release and governance gates

The constitution defines six gates. Each is listed here with the check that satisfies it.

| Gate | How to satisfy it |
|---|---|
| Specification complete | `specs/001-1024-browser-game/checklists/requirements.md` has every item passing |
| Plan constitution-checked | `plan.md` shows a PASS in the Constitution Check table, before and after design |
| Tasks traceable | Every task in `tasks.md` cites a requirement ID and a plan artifact |
| Tests pass | `npm test` exits 0 |
| Accessibility verified | Steps 5 and 6 in this guide pass |
| No dependency drift | The project has no `dependencies` and no `devDependencies` in `package.json` |

## 9. Verify the repository workflow

The repository requires pull requests to merge into `main`. This is a constitutional requirement,
not only a platform setting: constitution v1.1.0 and
[amendment 001](../../.specify/memory/amendments/001-pull-request-requirement.md) require that every
change arrive through a pull request whose status checks pass. Confirm the workflow still holds:

```bash
gh api repos/nsierraj/1024-game/rulesets --jq '.[] | {name, enforcement, rules: [.rules[].type]}'
```

Expected: one active branch ruleset named `main-branch-protection`, targeting `main`, that includes
a `pull_request` rule and a `required_status_checks` rule.

To confirm that a direct push is actually rejected, try one:

```bash
git push origin HEAD:main
```

Expected: the push is rejected by the ruleset with `GH013`, naming both the pull request
requirement and the expected status checks. A rejected push leaves the local branch untouched, so
nothing needs to be undone afterwards.

To confirm that the normal path still works, open a pull request from the feature branch to
`main`, wait for the required check to pass, and merge it.

**Pass condition**: the direct push is rejected and the pull request merges cleanly.

---

## Command summary

| Purpose | Command |
|---|---|
| Run the game locally | `node scripts/serve.mjs` |
| Run the full test suite | `npm test` |
| Run one test file | `node --test tests/unit/board.test.js` |
| Check the spec integrity | `node scripts/check-specs.mjs` |
| Open a pull request | `gh pr create --base main --head 001-1024-browser-game` |
| Check the branch rules | `gh api repos/nsierraj/1024-game/rulesets` |
