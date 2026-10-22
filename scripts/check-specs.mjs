#!/usr/bin/env node
/**
 * Spec integrity check.
 *
 * Validates that every feature directory under specs/ carries a complete, self-consistent
 * specification and plan. It is deliberately dependency-free: it runs with `node` alone, so it
 * can be the required status check on a branch that is protected against direct pushes.
 *
 * Checks performed:
 *   1. Each feature directory has spec.md, plan.md, and checklists/requirements.md.
 *   2. No unresolved template placeholders remain in spec.md, plan.md, or contracts/.
 *   3. Functional requirement ids are unique and contiguous from FR-001.
 *   4. Success criterion ids are unique and contiguous from SC-001.
 *   5. Every FR/SC id referenced by the checklist exists in the spec.
 *   6. Every checklist item is checked.
 *   7. The spec records a clarification session.
 *
 * Exit status: 0 when every check passes, 1 otherwise.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPECS_DIR = join(ROOT, "specs");

const failures = [];
const notes = [];

function fail(where, message) {
  failures.push(`${where}: ${message}`);
}

function readIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    fail(relative(ROOT, path), `could not be read: ${error.message}`);
    return null;
  }
}

/** Placeholders that must never survive into a finished artifact. */
const PLACEHOLDERS = [
  { pattern: /\[FEATURE\]/g, label: "[FEATURE]" },
  { pattern: /\[DATE\]/g, label: "[DATE]" },
  { pattern: /\[###-feature-name\]/g, label: "[###-feature-name]" },
  { pattern: /NEEDS CLARIFICATION/g, label: "NEEDS CLARIFICATION" },
  { pattern: /\bTODO\b/g, label: "TODO" },
  { pattern: /\bTBD\b/g, label: "TBD" },
  { pattern: /\[Extract from/g, label: "[Extract from ...]" },
  { pattern: /ACTION REQUIRED/g, label: "ACTION REQUIRED" },
];

function checkPlaceholders(label, text) {
  for (const { pattern, label: token } of PLACEHOLDERS) {
    const hits = text.match(pattern);
    if (hits && hits.length > 0) {
      fail(label, `contains ${hits.length} unresolved placeholder(s): ${token}`);
    }
  }
}

/** Collects ids like FR-001 from bolded bullet lines. */
function collectIds(text, prefix) {
  const ids = [];
  const re = new RegExp(`\\*\\*${prefix}-(\\d{3})\\*\\*`, "g");
  let match;
  while ((match = re.exec(text)) !== null) {
    ids.push(`${prefix}-${match[1]}`);
  }
  return ids;
}

function checkContiguous(label, ids, prefix) {
  const seen = new Set();
  const duplicates = [];
  for (const id of ids) {
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  if (duplicates.length > 0) {
    fail(label, `duplicate ids: ${[...new Set(duplicates)].join(", ")}`);
  }

  const numbers = ids.map((id) => Number(id.split("-")[1])).sort((a, b) => a - b);
  if (numbers.length === 0) {
    fail(label, "no ids found");
    return;
  }
  const expected = [];
  for (let n = numbers[0]; n <= numbers[numbers.length - 1]; n += 1) expected.push(n);

  const missing = expected.filter((n) => !numbers.includes(n));
  if (missing.length > 0) {
    fail(
      label,
      `ids are not contiguous; missing ${missing.map((n) => `${prefix}-${String(n).padStart(3, "0")}`).join(", ")}`
    );
  }
  if (numbers[0] !== 1) {
    fail(label, `ids must start at 001, found ${String(numbers[0]).padStart(3, "0")}`);
  }
}

function checkFeature(featureDir) {
  const featureName = relative(ROOT, featureDir);
  const specPath = join(featureDir, "spec.md");
  const planPath = join(featureDir, "plan.md");
  const checklistPath = join(featureDir, "checklists", "requirements.md");

  for (const [path, what] of [
    [specPath, "spec.md"],
    [planPath, "plan.md"],
    [checklistPath, "checklists/requirements.md"],
  ]) {
    if (!existsSync(path)) {
      fail(featureName, `missing ${what}`);
    }
  }
  if (failures.length > 0) return;

  const spec = readFileSync(specPath, "utf8");
  const plan = readFileSync(planPath, "utf8");
  const checklist = readFileSync(checklistPath, "utf8");

  checkPlaceholders(`${featureName}/spec.md`, spec);
  checkPlaceholders(`${featureName}/plan.md`, plan);

  const contractsDir = join(featureDir, "contracts");
  if (existsSync(contractsDir)) {
    for (const entry of readdirSync(contractsDir)) {
      if (!entry.endsWith(".md")) continue;
      checkPlaceholders(`${featureName}/contracts/${entry}`, readFileSync(join(contractsDir, entry), "utf8"));
    }
  } else {
    fail(featureName, "missing contracts/ directory");
  }

  const frIds = collectIds(spec, "FR");
  const scIds = collectIds(spec, "SC");
  checkContiguous(`${featureName} FR ids`, frIds, "FR");
  checkContiguous(`${featureName} SC ids`, scIds, "SC");
  notes.push(`${featureName}: ${frIds.length} functional requirements, ${scIds.length} success criteria`);

  const known = new Set([...frIds, ...scIds]);
  const referenced = checklist.match(/\b(?:FR|SC)-\d{3}\b/g) ?? [];
  const unknown = [...new Set(referenced)].filter((id) => !known.has(id));
  if (unknown.length > 0) {
    fail(`${featureName}/checklists/requirements.md`, `references ids not defined in the spec: ${unknown.join(", ")}`);
  }

  const unchecked = checklist.match(/^- \[ \]/gm) ?? [];
  if (unchecked.length > 0) {
    fail(`${featureName}/checklists/requirements.md`, `${unchecked.length} item(s) are still unchecked`);
  }

  if (!/^##\s+Clarifications/m.test(spec)) {
    fail(`${featureName}/spec.md`, "missing a Clarifications section");
  }

  checkTasks(join(featureDir, "tasks.md"));
}

/**
 * Validates the task list format. Tasks must be machine-readable so the list stays executable
 * and so a malformed entry cannot slip past a review.
 */
function checkTasks(tasksPath) {
  if (!existsSync(tasksPath)) return; // tasks are optional until the tasks phase runs
  const label = relative(ROOT, tasksPath);
  const lines = readFileSync(tasksPath, "utf8").split("\n");

  const TASK = /^(- \[[ x]\] )(T\d{3})( \[P\])?( \[US\d+\])? (.+)$/;
  // A line that looks like a checkbox must be a task, whatever the checkbox says. A malformed one
  // is a failure, not a line to skip, or a broken task would hide from the check entirely.
  const TASK_LINE = /^- \[(?: |x|X)\]/;
  const tasks = [];
  let inFence = false;

  lines.forEach((line, index) => {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (!TASK_LINE.test(line)) return;

    const match = line.match(TASK);
    if (!match) {
      fail(label, `line ${index + 1} does not match the required task format: ${line.trim()}`);
      return;
    }
    tasks.push({
      id: match[2],
      done: match[1] === "- [x] ",
      parallel: Boolean(match[3]),
      story: match[4] ? match[4].replace(/[[\]]/g, "") : null,
      description: match[5],
      line: index + 1,
    });
  });

  if (tasks.length === 0) {
    fail(label, "contains no tasks");
    return;
  }

  const ids = tasks.map((t) => t.id);
  if (new Set(ids).size !== ids.length) {
    fail(label, "contains duplicate task ids");
  }
  tasks.forEach((task, index) => {
    const expected = `T${String(index + 1).padStart(3, "0")}`;
    if (task.id !== expected) {
      fail(label, `task ids are not sequential: expected ${expected}, found ${task.id} on line ${task.line}`);
    }
  });

  // A story label belongs only inside a user story phase, and every user story phase task
  // must carry one.
  let phase = "";
  let phaseExpectsStory = false;
  lines.forEach((line, index) => {
    if (line.startsWith("## ")) {
      phase = line.slice(3).trim();
      phaseExpectsStory = /^Phase \d+: User Story \d/.test(phase);
    }
    if (!TASK_LINE.test(line)) return;
    const match = line.match(TASK);
    if (!match) return;
    const hasStory = Boolean(match[4]);
    if (phaseExpectsStory && !hasStory) {
      fail(label, `line ${index + 1} is in "${phase}" but has no user story label`);
    }
    if (!phaseExpectsStory && hasStory) {
      fail(label, `line ${index + 1} carries a user story label but is not in a user story phase`);
    }
  });

  // Every task must point at a concrete file so it can be executed without further context.
  const pathPattern = /`[^`]*(\/[^`]*|[A-Za-z0-9_-][A-Za-z0-9._-]*\.[A-Za-z0-9]{2,12})`/;
  tasks.forEach((task) => {
    if (!pathPattern.test(task.description)) {
      fail(label, `task ${task.id} does not name a file path: ${task.description}`);
    }
  });

  const done = tasks.filter((task) => task.done).length;
  notes.push(`${label}: ${tasks.length} tasks (${done} complete)`);
}

// --- run -------------------------------------------------------------------

if (!existsSync(SPECS_DIR)) {
  console.error("specs/ directory not found");
  process.exit(1);
}

const featureDirs = readdirSync(SPECS_DIR)
  .map((entry) => join(SPECS_DIR, entry))
  .filter((path) => statSync(path).isDirectory())
  .sort();

if (featureDirs.length === 0) {
  console.error("no feature directories found under specs/");
  process.exit(1);
}

for (const dir of featureDirs) checkFeature(dir);

if (failures.length > 0) {
  console.error("Spec integrity check FAILED\n");
  for (const failure of failures) console.error(`  x ${failure}`);
  console.error("");
  process.exit(1);
}

console.log("Spec integrity check passed");
for (const note of notes) console.log(`  - ${note}`);
