#!/usr/bin/env node
/**
 * Runs the test suite and refuses to pass vacuously.
 *
 * `node --test` exits 0 when it finds no test files at all. The `test` job is a required status
 * check on the protected branch, so a suite that collects nothing would leave the gate green on a
 * branch that contains no tests, which is the exact failure the check exists to catch.
 *
 * The guard is conditional. It applies only once implementation has started, which is detected by
 * the presence of any file under `src/`. Before that point there is genuinely nothing to test,
 * and failing the check would block specification work that has nothing to do with tests. Once
 * code exists, collecting zero tests is a failure.
 *
 * Zero dependencies, consistent with the rest of the tooling in this repository.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, "src");

/**
 * Lists every file under a directory, recursively.
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(full));
    else found.push(full);
  }
  return found;
}

/**
 * Reads the collected test count out of the reporter output. The spec reporter prints
 * `ℹ tests N` and the tap reporter prints `# tests N`; either is accepted so the script does not
 * depend on one reporter's formatting.
 * @param {string} output
 * @returns {number}
 */
function parseTestCount(output) {
  const match = output.match(/^(?:# |ℹ )tests (\d+)$/m);
  return match ? Number(match[1]) : 0;
}

const result = spawnSync(process.execPath, ["--test", "--test-reporter=spec"], {
  cwd: ROOT,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const stdout = result.stdout ?? "";
const stderr = result.stderr ?? "";
process.stdout.write(stdout);
process.stderr.write(stderr);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const tests = parseTestCount(`${stdout}\n${stderr}`);
if (tests > 0) {
  process.exit(0);
}

const sources = listFiles(SRC);
if (sources.length === 0) {
  console.error("No tests collected. Nothing exists under src/ yet, so there is nothing to test.");
  process.exit(0);
}

console.error("");
console.error("The test suite collected 0 tests, but implementation code exists under src/.");
console.error("Constitution Principle III requires an automated test for every rule in BRD 6.1 to 6.5.");
console.error("Source files found:");
for (const file of sources) {
  console.error(`  ${relative(ROOT, file)}`);
}
process.exit(1);
