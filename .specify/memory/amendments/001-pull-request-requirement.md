# Amendment 001: Pull Request Requirement

| | |
|---|---|
| **Proposed** | 2026-10-21 |
| **Status** | **Approved** 2026-10-21 by the product owner. Merged as pull request #3. |
| **Constitution version** | 1.0.0 -> 1.1.0 (MINOR) |
| **Amends** | `Development Workflow and Quality Gates` |
| **Proposal author** | Project owner (drafted in session) |

---

## 1. The change

The `Development Workflow and Quality Gates` section of the constitution gains six requirements and
one verification note. No Core Principle is added, removed, or redefined. No release gate changes.

In short: the constitution will state that code reaches `main` only through a pull request, that
the required checks must pass before it merges, that the history stays linear, and that the review
count may not exceed the number of people available to give reviews.

Today the requirement exists only as a platform setting. A settings page is configuration; it is
not a rule the project is held to. If someone later removes the ruleset, nothing in the project's
own documents says that was wrong. This amendment makes the rule explicit so that the repository's
governance is part of its constitution rather than an accident of its settings.

## 2. The rationale

**Why the pull request requirement is constitutional and not merely a setting.** The constitution's
whole argument is that the guardrails are what keep the project's promises credible. A promise that
a change was reviewed is only credible if reviewing is mandatory. Once `main` accepts direct
pushes, the review requirement becomes discretionary, and the first unreviewed commit under time
pressure erodes it. Stating the rule is what makes it survive a bad week.

**Why this lives in the workflow section and not in the Core Principles.** The Core Principles
constrain the *product*: the stack, the logic, the tests, the accessibility, the budgets. Each one
is something a plan or an implementation decision can get right or wrong. The pull request
requirement is a property of the *repository configuration*, and no implementation choice can
satisfy or violate it. Putting it in the Core Principles would add a row to every future
Constitution Check that can only ever be answered "yes, the ruleset is on" — a check that
structurally cannot fail teaches reviewers to read past it. The workflow section already holds
this kind of control: it holds the release gates, and a release gate is also not an
implementation choice.

**Why the review count is zero for now.** GitHub does not count the pull request author's own
approval. Requiring one approving review on a repository with a single owner produces a gate that
nobody can satisfy, which blocks delivery without adding assurance — a blocked project, not a
quality control. The amendment therefore requires that the review count stay at or below the
number of people able to give reviews, which is zero today, and requires it to rise as soon as a
second reviewer exists. The rule states the floor, not the current value, so it stays correct
when the team changes.

**Why an emergency escape hatch is stated.** A branch that cannot be pushed to has no recovery
path through the normal workflow. The escape is not "admins may bypass", which would quietly undo
the rule; it is "a temporary documented bypass, back-filled afterwards", which keeps the history
complete and the deviation visible.

## 3. The proposed text

To be inserted into `Development Workflow and Quality Gates`, after the code-review bullet and
before the release gates:

> - Every change to `main` MUST arrive through a pull request. Direct pushes to `main` MUST be
>   blocked, and the block MUST cover repository owners and administrators so it cannot be bypassed
>   by privilege.
> - A pull request MUST NOT become mergeable until its required status checks pass. The required
>   checks MUST include the automated test suite from Principle III and the specification
>   integrity check, so a change to the rules, the data model, or the constitution cannot land
>   without being validated.
> - `main` MUST NOT accept force pushes, branch deletion, or merge commits. The history MUST stay
>   linear, and every change MUST be attributable to a reviewed pull request.
> - The number of required approving reviews MUST NOT exceed the number of people able to give
>   them. While the repository has a single owner the requirement MUST be zero, and it MUST be
>   raised as soon as a second reviewer is available. A gate that nobody can satisfy blocks
>   delivery without adding assurance.
> - The protection configuration MUST be recorded in the repository's documentation, including the
>   names of the required checks, so it can be audited without access to the repository settings.
> - An emergency change that cannot wait for a pull request MUST be applied through a temporary,
>   documented bypass of the protection rule, and MUST be back-filled through a pull request as
>   soon as one is possible. The bypass MUST be removed once it is no longer needed.

And the verification note, appended to the end of the section:

> These controls are verified continuously by the platform rather than at a feature gate, because
> they are properties of the repository configuration and not of any one feature. The Constitution
> Check at each plan gate MUST still record that the configuration satisfies them.

One further change, to the `Governance` section, so that amendment proposals are discoverable
rather than lost in a commit message:

> The written proposal MUST be retained in the repository under `.specify/memory/amendments/`.

## 4. The concrete configuration

The rule and the configuration it requires are recorded here so they can be audited.

| Setting | Value |
|---|---|
| Mechanism | Repository ruleset (the classic branch-protection API cannot express "require a pull request" for a personal repository) |
| Ruleset name | `main-branch-protection` |
| Ruleset id | `25589514` |
| Enforcement | `active` |
| Applies to | `refs/heads/main` |
| Bypass actors | none — `current_user_can_bypass: never` |
| Require a pull request | yes, direct pushes rejected |
| Required approving reviews | 0 |
| Required status checks | `spec-integrity`, `test`, with the strict policy enabled |
| Review thread resolution | required |
| Stale reviews dismissed on push | yes |
| Allowed merge methods | `squash`, `rebase` |
| Linear history | required |
| Force pushes | blocked |
| Branch deletion | blocked |

The `spec-integrity` check is `node scripts/check-specs.mjs`. The `test` check is `npm test`, which
runs `node --test`. Neither uses a third-party package, so the project keeps its zero-dependency,
no-build-step property.

## 5. Impact on existing specifications, plans, and tasks

| Artifact | Impact | Action |
|---|---|---|
| `specs/001-1024-browser-game/spec.md` | None. The specification describes the product, not the repository workflow. No FR or SC changes, so SC-003 coverage is unaffected. | No change |
| `specs/001-1024-browser-game/checklists/requirements.md` | None. | No change |
| `specs/001-1024-browser-game/plan.md` | The Constitution Check table names the constitution version, and its `Development Workflow and Quality Gates` row predates the pull request requirement. The plan's post-design re-check must be restated against v1.1.0. | Updated in this change |
| `specs/001-1024-browser-game/quickstart.md` | Section 9 already verifies the ruleset. It should name the ruleset and point at this amendment so a reader can trace the rule to its source. | Updated in this change |
| `specs/001-1024-browser-game/tasks.md` | Not yet created. Every implementation task MUST land through a pull request whose required checks pass before the task is considered done. | Stated as a constraint on the tasks phase |
| `README.md` | The `Contributing` section already names both required checks, which satisfies the "recorded in the repository's documentation" clause. | No change |
| `1024-game-BRD.md` | None. The BRD is a product requirements document and says nothing about repository workflow. | No change |
| `.specify/memory/constitution.md` | Version 1.0.0 -> 1.1.0, new Sync Impact Report, six bullets and one note added, one clause added to Governance. | Updated in this change |

**Impact on future plans.** The Constitution Check table in every future plan carries a
`Development Workflow and Quality Gates` row. That row must record that the repository
configuration satisfies the new requirements. The check is cheap and real: the reviewer confirms
the ruleset is present, active, and covers `main`.

**Impact on future amendments.** This amendment is the first entry under
`.specify/memory/amendments/`, which establishes the directory as the place proposals are kept.

## 6. Compliance and verification

| Requirement | How it is verified | Frequency |
|---|---|---|
| Direct pushes are blocked | A probe commit is pushed to `main` and the rejection is confirmed | Once at setup, and after any change to the ruleset |
| Required checks are enforced | The ruleset's `required_status_checks` list is read back through the API | Once at setup |
| Checks actually gate the merge | A pull request is opened and its check results are read before merging | Every pull request |
| The review count is satisfiable | The count is compared against the number of available reviewers | Each review of the amendment |
| The configuration is documented | The `Contributing` section of the README is read | Each review of the amendment |

The probe described above was already performed against this repository on 2026-10-21 and the
rejection was confirmed:

```
remote: - Changes must be made through a pull request.
remote: - 2 of 2 required status checks are expected.
```

## 7. What this amendment does not do

- It does **not** require a second reviewer. The review count rule sets a floor, not a value.
- It does **not** add a Core Principle, and it does not change any of the five.
- It does **not** change the release gates, the specification, or the success criteria.
- It does **not** require a CODEOWNERS file, a reviewer rotation, or an automatic merge queue.
  Those become worth revisiting when a second reviewer exists.
- It does **not** grant any exception and does not create any deferred item.

## 8. Decision

**Approved 2026-10-21 by the product owner**, with the text in section 3 adopted as written. The
amendment took effect as constitution v1.1.0 through pull request #3, which reached `main` through
the workflow this amendment makes binding.

Two consequences follow from the approval and are recorded here so they are not lost:

- The required approving review count remains **zero**, because the repository has a single owner.
  It is to be raised as soon as a second reviewer is available.
- The `spec-integrity` and `test` checks are now required status checks on `main`, not merely
  checks that happen to run.
